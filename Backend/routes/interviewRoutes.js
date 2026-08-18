const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { verifyToken } = require("../middleware/authMiddleware");

// POST /api/interview/generate
router.post("/generate", verifyToken, async (req, res) => {
  try {
    const { role, company, experienceLevel } = req.body;

    if (!role || role.trim() === "") {
      return res.status(400).json({ success: false, message: "Job role is required." });
    }
    if (!company || company.trim() === "") {
      return res.status(400).json({ success: false, message: "Target company is required." });
    }
    const exp = experienceLevel || "Entry Level";

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
    You are a professional technical recruiter and engineering manager.
    Generate a list of exactly 5 tailored interview questions for a candidate interviewing for the role of "${role}" at "${company}" for an "${exp}" level.
    The list must include a mix of technical core topics (typical for this role's stack) and behavioral or situational questions.
    
    You must return a raw JSON object matching the following JSON schema:
    {
      "questions": [
        {
          "id": 1,
          "type": "Technical",
          "question": "Explain the difference between SQL and NoSQL databases."
        },
        {
          "id": 2,
          "type": "Behavioral",
          "question": "Tell me about a time you handled a difficult conflict within a engineering team."
        }
      ]
    }
    
    Ensure the output is valid JSON and contains exactly 5 questions.
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
    console.error("Interview generation route error:", err);
    res.status(500).json({ success: false, message: "Internal server error during question generation." });
  }
});

// POST /api/interview/evaluate
router.post("/evaluate", verifyToken, async (req, res) => {
  try {
    const { role, company, experienceLevel, answers } = req.body;

    if (!role || !company || !answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ success: false, message: "Missing required evaluation fields." });
    }
    const exp = experienceLevel || "Entry Level";

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
    You are a professional technical interviewer and career coach.
    Evaluate the candidate's answers to the interview questions for the role of "${role}" at "${company}" (${exp} level).
    
    Here is the list of questions and the candidate's submitted answers:
    ${JSON.stringify(answers, null, 2)}
    
    Evaluate each answer objectively. Provide:
    - An overall score for the entire interview session out of 100.
    - A score out of 10 for each individual answer.
    - Detailed constructive critique for each answer pointing out gaps, correctness, and suggestions for improvement.
    - A professional model answer for each question for candidate comparison.
    - A pass status based on overall performance (e.g., "Passed", "Passed with Feedback", "Needs Improvement").
    
    You must return a raw JSON object matching the following JSON schema:
    {
      "overallScore": 75,
      "status": "Passed with Feedback",
      "evaluations": [
        {
          "id": 1,
          "score": 8,
          "critique": "Solid explanation of the concepts. However, you should mention specific indexes and memory structures to show deep knowledge.",
          "modelAnswer": "SQL databases are relational, table-based, and scale vertically... NoSQL databases are non-relational, document/key-value based, and scale horizontally..."
        }
      ]
    }
    
    Ensure the output is valid JSON and maps evaluations to each answer by matching the unique question ID.
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
    console.error("Interview evaluation route error:", err);
    res.status(500).json({ success: false, message: "Internal server error during evaluation." });
  }
});

module.exports = router;
