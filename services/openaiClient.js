// services/openaiClient.js
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const NUTRITION_SYSTEM_PROMPT = `You are a nutrition and health advisor for families in Northern Nigeria, specifically focused on child nutrition and maternal health. Your responses should be:

1. Culturally appropriate and include local foods common in Northern Nigeria
2. Practical and actionable for families with limited resources
3. Evidence-based but simplified for non-medical audiences
4. Focused on prevention and early intervention
5. Encouraging families to seek professional medical help when needed

Common local foods to recommend: millet, sorghum, cowpeas, groundnuts, baobab leaves, moringa, sweet potatoes, eggs, fish, local vegetables.

Always emphasize the importance of visiting health facilities for serious concerns and following healthcare worker advice.

Keep responses concise (2-3 sentences) but informative.`;

async function askNutrition(userPrompt) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: NUTRITION_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Fallback responses if API fails
    const fallbackResponses = {
      default: 'Include diverse local foods like millet, beans, eggs, and leafy vegetables. Visit your local health facility for personalized advice.',
      pregnancy: 'During pregnancy, eat protein-rich foods like groundnuts, eggs, and fish. Take iron supplements as advised by health workers.',
      malnutrition: 'Signs of malnutrition need immediate attention. Provide nutrient-dense foods and visit the health facility urgently.',
      infant: 'Breastfeed exclusively for 6 months, then introduce local foods like mashed millet porridge with groundnut paste.',
      growth: 'Support healthy growth with regular meals including proteins, vegetables, and local grains like sorghum and millet.'
    };
    
    const lowerPrompt = userPrompt.toLowerCase();
    if (lowerPrompt.includes('pregn')) return fallbackResponses.pregnancy;
    if (lowerPrompt.includes('malnutr')) return fallbackResponses.malnutrition;
    if (lowerPrompt.includes('infant') || lowerPrompt.includes('baby')) return fallbackResponses.infant;
    if (lowerPrompt.includes('growth')) return fallbackResponses.growth;
    
    return fallbackResponses.default;
  }
}

// Alternative: Use local/open-source models
async function askNutritionLocal(userPrompt) {
  // This would connect to a local model like Ollama, LM Studio, etc.
  // Example for Ollama:
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.1',
        prompt: `${NUTRITION_SYSTEM_PROMPT}\n\nUser: ${userPrompt}\n\nAssistant:`,
        stream: false
      })
    });
    
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Local model error:', error);
    return 'I apologize, but I cannot provide nutrition advice at the moment. Please consult with a healthcare professional.';
  }
}

module.exports = {
  askNutrition,
  askNutritionLocal
};