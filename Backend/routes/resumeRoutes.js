const express = require("express");
const router = express.Router();
const pdfParse = require("pdf-parse");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { verifyToken } = require("../middleware/authMiddleware");

// POST /api/resume/analyze
router.post("/analyze", verifyToken, async (req, res) => {
  try {
    const { resumeBase64, jobDescription } = req.body;

    if (!resumeBase64) {
      return res.status(400).json({ success: false, message: "Resume file is required." });
    }

    if (!jobDescription || jobDescription.trim() === "") {
      return res.status(400).json({ success: false, message: "Job description is required." });
    }

    // Convert base64 to buffer
    const base64Data = resumeBase64.includes(",") ? resumeBase64.split(",")[1] : resumeBase64;
    const pdfBuffer = Buffer.from(base64Data, "base64");

    // Parse PDF text
    let resumeText = "";
    try {
      const parsedData = await pdfParse(pdfBuffer);
      resumeText = parsedData.text;
    } catch (parseErr) {
      console.error("PDF Parsing error:", parseErr);
      return res.status(400).json({
        success: false,
        message: "Failed to read PDF resume. Please ensure it is a valid, non-scanned text PDF.",
      });
    }

    if (!resumeText || resumeText.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Could not extract text from the resume. Please upload a text-based PDF.",
      });
    }

    // Call Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "Gemini API key is not configured on the server. Please contact administrator.",
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    You are an expert ATS (Applicant Tracking System) parser and professional career coach.
    Your task is to analyze the candidate's resume and the target job description, then provide a detailed compatibility report.
    
    Candidate Resume Text:
    """
    ${resumeText}
    """
    
    Target Job Description:
    """
    ${jobDescription}
    """
    
    You must return a raw JSON object matching the following JSON schema:
    {
      "matchPercentage": 78,
      "status": "Good Match",
      "matchedKeywords": ["Keyword1", "Keyword2"],
      "missingKeywords": ["Keyword3", "Keyword4"],
      "strengths": [
        "Description of strength 1",
        "Description of strength 2"
      ],
      "weaknesses": [
        "Description of weakness 1",
        "Description of weakness 2"
      ],
      "suggestions": [
        {
          "section": "Section Name (e.g. Skills / Projects)",
          "finding": "Brief summary of what is missing or weak",
          "recommendation": "Concrete suggestion on how to improve this section"
        }
      ],
      "bulletPointEdits": [
        {
          "original": "Original bullet point in the resume",
          "optimized": "Optimized version of the bullet point containing target keywords",
          "reason": "Brief explanation of why this optimized version is better for ATS screening"
        }
      ]
    }
    
    Status guidelines:
    - "Excellent Match" for scores >= 85
    - "Good Match" for scores 70-84
    - "Needs Improvement" for scores 50-69
    - "Weak Match" for scores < 50
    
    Ensure the output is valid JSON. Do not include markdown formatting, backticks, or any explanation text outside the JSON. Return only the JSON object.
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const responseText = result.response.text();
    let analysis;
    try {
      analysis = JSON.parse(responseText);
    } catch (jsonErr) {
      console.error("Gemini JSON Parsing error. Raw output:", responseText);
      return res.status(500).json({
        success: false,
        message: "Failed to parse analysis report. Please try again.",
      });
    }

    res.json({
      success: true,
      data: analysis,
    });
  } catch (err) {
    console.error("Resume analysis route error:", err);
    res.status(500).json({ success: false, message: "Internal server error during analysis." });
  }
});

module.exports = router;
