const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { verifyToken } = require("../middleware/authMiddleware");

// POST /api/code/review
router.post("/review", verifyToken, async (req, res) => {
  try {
    const { code, language, problemDescription } = req.body;

    if (!code || code.trim() === "") {
      return res.status(400).json({ success: false, message: "Code content is required." });
    }
    if (!language || language.trim() === "") {
      return res.status(400).json({ success: false, message: "Coding language is required." });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "Gemini API key is not configured on the server. Please contact administrator.",
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

    const prompt = `
    You are an expert software engineer and technical code reviewer.
    Analyze the following code written in "${language}".
    
    ${problemDescription && problemDescription.trim() !== "" ? `The code is designed to solve the following problem:
    "${problemDescription}"` : `No problem description was provided. Please automatically infer the algorithm's objective, logic, and functional purpose directly from the code's syntax and structure.`}
    
    Candidate's Code:
    ${code}
    
    Conduct a deep technical analysis of the code. You must return a raw JSON object matching this schema:
    {
      "timeComplexity": "O(N log N)",
      "spaceComplexity": "O(N)",
      "grade": "B+",
      "bugs": [
        "Index out of bounds error when array length is 0.",
        "Inefficient recursive calls without memoization."
      ],
      "critique": "Your solution is functionally correct and handles standard inputs. However, time complexity can be improved by sorting the array first.",
      "optimizedCode": "The fully optimized, cleanly formatted refactored code block here",
      "explanation": "Brief explanation of the optimization logic."
    }
    
    Ensure the returned JSON is valid, matches the schema, and includes a completely optimized code block without code fences or formatting markers.
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const text = result.response.text();
    const parsedData = JSON.parse(text);

    res.status(200).json({
      success: true,
      data: parsedData,
    });
  } catch (err) {
    console.error("Code playground review error:", err);
    res.status(500).json({ success: false, message: "Internal server error during code review." });
  }
});

module.exports = router;
