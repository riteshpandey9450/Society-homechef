/**
 * Gemini AI-based nutrition estimation
 * Falls back to keyword heuristics if API unavailable
 */

// Log the "no key" warning only once per process startup
let _geminiWarnLogged = false;

const estimateNutritionWithGemini = async (dishName, description) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    if (!_geminiWarnLogged) {
      console.log('⚠️  Gemini API key not set, using heuristic fallback for nutrition estimation.');
      _geminiWarnLogged = true;
    }
    return heuristicNutritionEstimate(dishName, description);
  }

  try {
    const prompt = `You are a professional nutritionist. Analyze this dish and provide accurate nutritional estimates.

Dish Name: ${dishName}
Description: ${description}

Based on the dish name and description, provide a detailed nutritional analysis. Return ONLY a valid JSON object in this exact format:
{
  "calories": <number per serving>,
  "protein": <grams>,
  "carbs": <grams>,
  "fat": <grams>,
  "fiber": <grams>,
  "healthScore": <number 1-10, where 10 is healthiest>,
  "healthNote": "<brief 1-sentence health insight>"
}

Be realistic and accurate. Consider typical Indian/Asian serving sizes.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            topK: 1,
            topP: 1,
            maxOutputTokens: 500
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const nutrition = JSON.parse(jsonMatch[0]);
      return {
        calories: Math.round(nutrition.calories) || null,
        protein: Math.round(nutrition.protein) || null,
        carbs: Math.round(nutrition.carbs) || null,
        fat: Math.round(nutrition.fat) || null,
        fiber: Math.round(nutrition.fiber) || null,
        healthScore: Math.min(10, Math.max(1, Math.round(nutrition.healthScore))) || 5,
        healthNote: nutrition.healthNote || null,
        source: 'gemini'
      };
    }

    throw new Error('Could not parse Gemini response');

  } catch (err) {
    console.error('Gemini API error, using fallback:', err.message);
    return heuristicNutritionEstimate(dishName, description);
  }
};

/**
 * Keyword-based heuristic nutrition estimator
 */
const heuristicNutritionEstimate = (dishName, description) => {
  const text = `${dishName} ${description}`.toLowerCase();

  let calories = 350;
  let protein = 12;
  let carbs = 45;
  let fat = 12;
  let fiber = 3;
  let healthScore = 5;

  // High protein indicators
  if (/chicken|mutton|egg|paneer|fish|prawn|tofu|soya/.test(text)) {
    protein += 15;
    calories += 80;
    healthScore += 1;
  }

  // High carb indicators
  if (/rice|biryani|pulao|roti|naan|paratha|bread|pasta|noodle/.test(text)) {
    carbs += 30;
    calories += 100;
  }

  // High fat/calorie indicators
  if (/fried|butter|ghee|cream|cheese|malai|kadai|masala/.test(text)) {
    fat += 10;
    calories += 120;
    healthScore -= 1;
  }

  // Healthy indicators
  if (/salad|sprout|boiled|steamed|grilled|green|veggie|vegetable|dal|lentil/.test(text)) {
    fiber += 5;
    calories -= 60;
    healthScore += 2;
  }

  // Dessert / sweet
  if (/sweet|gulab|halwa|kheer|ladoo|barfi|cake|chocolate|dessert/.test(text)) {
    calories += 150;
    carbs += 35;
    fat += 8;
    healthScore -= 2;
  }

  // Soup / light
  if (/soup|shorba|rasam|kadhi/.test(text)) {
    calories -= 100;
    healthScore += 1;
  }

  healthScore = Math.min(10, Math.max(1, healthScore));
  calories = Math.max(50, calories);

  return {
    calories,
    protein,
    carbs,
    fat,
    fiber,
    healthScore,
    healthNote: `Estimated nutrition for ${dishName}. Values are approximate.`,
    source: 'heuristic'
  };
};

module.exports = { estimateNutritionWithGemini };
