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
    if (!problemDescription || problemDescription.trim() === "") {
      return res.status(400).json({ success: false, message: "Problem description is required." });
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
    Analyze the following code written in "${language}" solving the described coding problem.
    
    Problem Statement:
    "${problemDescription}"
    
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

// POST /api/code/chat
router.post("/chat", verifyToken, async (req, res) => {
  try {
    const { code, language, problemDescription, chatHistory, message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ success: false, message: "User message is required." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "Gemini API key is not configured on the server.",
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // System instruction prompt mapping the context of the editor
    const systemPrompt = `
You are a highly supportive, intelligent DSA Coach and Coding Mentor.
The student is working on a coding challenge inside their playground editor.

Current Context:
- Programming Language: ${language || "Not specified"}
- Problem Description:
"""
${problemDescription || "Not specified"}
"""

Student's Current Editor Code:
\`\`\`${(language || "").toLowerCase()}
${code || "// Editor is currently empty"}
\`\`\`

Instructions for your behavior:
1. Act as a Socratic coach: Guide the student with concepts, structural analysis, pseudocode, algorithm hints, and helpful questioning.
2. DO NOT provide full copy-paste solutions or refactored code blocks directly in your chat response unless the student explicitly asks you to explain a specific line or is completely stuck after several attempts. Encourage them to optimize it themselves.
3. Keep responses relatively concise, focused, formatted nicely in clean Markdown.
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite",
      systemInstruction: systemPrompt,
    });

    // Format chat history for Gemini API structure: { role: "user" | "model", parts: [{ text: turn.text }] }
    const formattedHistory = [];
    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.forEach((turn) => {
        if (turn.role && turn.text) {
          formattedHistory.push({
            role: turn.role === "user" ? "user" : "model",
            parts: [{ text: turn.text }],
          });
        }
      });
    }

    // Start a chat session with history
    const chat = model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage(message);
    const replyText = result.response.text();

    res.status(200).json({
      success: true,
      reply: replyText,
    });
  } catch (err) {
    console.error("Code playground mentor chat error:", err);
    res.status(500).json({ success: false, message: "Internal server error during chat." });
  }
});

module.exports = router;
