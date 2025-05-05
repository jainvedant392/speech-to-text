import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transcript } = body;

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Gemini API key' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are an expert medical information extraction assistant designed to support healthcare professionals. Your task is to carefully analyze the provided patient diagnosis transcript and extract key medical details, structuring the information as a precise JSON object according to the schema below.
Input Transcript:
${transcript}
JSON Output Schema:
json{
    "blood_pressure": "string",  // Format: "systolic/diastolic" (e.g., "120/80")
    "SPo2": "string",            // Format: "value%" (e.g., "98%")
    "heart_rate": "string",      // Format: "value bpm" (e.g., "72 bpm")
    "blood_sugar": "string",     // Format: "value unit" (e.g., "110 mg/dL" or "6.1 mmol/L")
    "diagnosis_summary": "string", // Primary diagnosis statement
    "tests": [                   // Array of ordered or recommended tests
        "string"
    ],
    "uploadedTests": [],         // Leave empty unless explicitly mentioned
    "additional_notes": "string", // Any relevant information not captured in other fields
    "prescriptions": [           // Array of medication details
        {
            "drug": "string",    // Medication name
            "dosage": "string",  // Amount and frequency (e.g., "10mg twice daily")
            "duration": "string", // Treatment period (e.g., "7 days")
            "method": "string"   // Administration route (e.g., "oral", "topical")
        }
    ]
}
Extraction Guidelines:

Accuracy First: Extract only information explicitly stated in the transcript. Never invent, assume, or infer details not present.
Value Formatting:

Convert all measurements to standard medical abbreviations
Blood pressure: "120/80"
Weight: "80kg" (not "80 kilos")
Temperature: "38.5°C" or "101.3°F"
Always retain numerical values as strings


Field-Specific Instructions:

blood_pressure: Extract systolic/diastolic values. If only one is mentioned, leave as partial information (e.g., "120/")
SPo2: Include the percentage symbol (e.g., "98%")
heart_rate: Include "bpm" unit (e.g., "72 bpm")
blood_sugar: Retain the exact unit mentioned (mg/dL, mmol/L, etc.)
diagnosis_summary: Capture the primary diagnosis statement or conclusion
tests: Include each individual test as a separate array element
additional_notes: Capture any contextual information including:

Patient symptoms not directly tied to diagnosis
Medical history references relevant to current condition
Lifestyle factors mentioned
Follow-up recommendations
Any other medically relevant details not fitting other fields




Prescription Details:

drug: Extract exact medication name (including brand/generic specification)
dosage: Combine amount and frequency (e.g., "500mg three times daily")
duration: Extract treatment period (e.g., "5 days", "2 weeks")
method: Extract administration route (e.g., "oral", "IV", "topical")


Empty Fields Handling:

For string fields with no data: use "" (empty string)
For array fields with no data: use [] (empty array)
Never use null or undefined values
Never use placeholder text like "Not specified"



Return ONLY the valid JSON object without any additional explanations or commentary. Ensure the JSON is properly formatted and syntactically correct.`

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            blood_pressure: {
              type: Type.STRING,
              description: 'Patient\'s blood pressure',
            },
            SPo2: {
              type: Type.STRING,
              description: 'Patient\'s SPo2 level',
            },
            heart_rate: {
              type: Type.STRING,
              description: 'Patient\'s heart rate',
            },
            blood_sugar: {
              type: Type.STRING,
              description: 'Patient\'s blood sugar level',
            },
            diagnosis_summary: {
              type: Type.STRING,
              description: 'Summary of the patient\'s diagnosis',
            },
            tests: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: 'List of ordered tests',
            },
            uploadedTests: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: 'List of uploaded test file names (should usually be empty)',
            },
            additional_notes: {
              type: Type.STRING,
              description: 'Any additional notes or observations',
            },
            prescriptions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  drug: {
                    type: Type.STRING,
                    description: 'Name of the prescribed drug',
                  },
                  dosage: {
                    type: Type.STRING,
                    description: 'Dosage of the drug',
                  },
                  duration: {
                    type: Type.STRING,
                    description: 'Duration for which the drug is prescribed',
                  },
                  method: {
                    type: Type.STRING,
                    description: 'Method of drug administration',
                  },
                },
                required: ['drug', 'dosage', 'duration', 'method'],
              },
              description: 'List of prescribed medications',
            },
          },
          required: [
            'blood_pressure',
            'SPo2',
            'heart_rate',
            'blood_sugar',
            'diagnosis_summary',
            'tests',
            'uploadedTests',
            'additional_notes',
            'prescriptions',
          ],
        },
      },
    });
    
    return NextResponse.json({ result: response.text });
  } catch (error) {
    console.error('Gemini Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
