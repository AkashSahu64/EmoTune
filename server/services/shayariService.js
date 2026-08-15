const axios = require('axios');
const logger = require('../utils/logger');
const { executeWithFallback } = require('../utils/fallbackChain');
const { parallelFetchAll } = require('./parallelFallback');

const SHAYARI_COLLECTION = {
  happy: [
    'Muskurahat hai toh duniya hai,\nMuskurahat hai toh khushi hai.\nAapki muskurahat hi,\nZindagi ki sabse badi dastaan hai.',
    'Khushiyan milti hain unhein,\nJo khush rehna jaante hain.\nHum toh bas aapki khushi mein,\nApni khushi dhoondhte hain.',
    'Har din ek nayi subah laaye,\nKhushiyon ke rang bikhar jaaye.\nAapki zindagi mein itni khushiyan hon,\nKe har pal ek tyohaar ban jaaye.',
    'Muskurate raho yunhi,\nKhushiyan tumhare qadam chumengi.\nHar gham ko door karke,\nZindagi mein rang bharengi.',
  ],
  sad: [
    'Tanhaiyon mein guzarti hain raatein,\nYaad tumhari aati hai.\nDil ko sukoon nahi milta,\nJab tum saath nahi hote.',
    'Aansu bhi kehte hain kuch,\nDard bhi hai zubaan.\nDil ki baat koi na jaane,\nBas yunhi guzarta hai samaa.',
    'Khamoshiyaan bhi khoobsoorat hoti hain,\nJab dil ki baatein alfaaz se pare hon.\nDard chhupa kar muskuraana bhi,\nEk kala hai is duniya mein.',
    'Bichadna toh likha tha,\nMilna bhi naseeb tha.\nDooriyan faasle badha kar bhi,\nDil ka mel tha.',
  ],
  love: [
    'Pyaar mein humne yeh seekha,\nDhadkanon se baat karna.\nDooriyon mein bhi apna,\nEk dooje ka saath narna.',
    'Aapki aankhon mein kho jaane ko dil chahta hai,\nAapki baaton mein doob jaane ko dil chahta hai.\nDoor hokar bhi kareeb ho aap,\nYeh raaz bata jaane ko dil chahta hai.',
    'Mohabbat ka sukoon kya hota hai,\nYeh woh jaante hain jo kisi ko chaahte hain.\nDhadkan mein basaa lo kisi ko,\nPhir dekho zindagi kya hoti hai.',
    'Ishq mein humne yeh paaya,\nPyaar toh bas ek ehsaas hai.\nKoi mil jaaye toh zindagi,\nEk khoobsurat raaz hai.',
  ],
  romantic: [
    'Aapki muskaan toh jaise phool khil jaate hain,\nAapki baatein toh jaise geet sunaate hain.\nAap jo saath ho toh har pal,\nEk naya junoon jagaa jaate hain.',
    'Pyaar mein humne yeh seekha,\nDhadkanon se baat karna.\nDooriyon mein bhi apna,\nEk dooje ka saath narna.',
    'Raatein katti nahi,\nNeendein aati nahi.\nJab se dekha tumhein,\nChain se hu nahi.',
    'Tumhari aankhon mein basa hua,\nEk jahaan hai.\nPyaar se dekho toh,\nHar pal naya sama hai.',
  ],
  angry: [
    'Gussa bhi kya cheez hai,\nDil ko jala deta hai.\nChain chheen leta hai,\nAur apna bana leta hai.',
    'Aag hai toh raakh hogi,\nGussa hai toh aakhir mitega.\nDil ko dene se pehle,\nZara soch lijiyega.',
    'Kuch rishton ka toh,\nBharosa bhi hai ehsaas.\nGussa ho toh bhi yaad rakhna,\nPyaar hai humare paas.',
    'Gussa aur pyaar ek hi sikka hai,\nJust palatne mein farak hai.\nSamjha karo dil ki baat,\nWarna pachtane ka waqt hai.',
  ],
  fearful: [
    'Dar lagta hai iss mann ko,\nKahan kho jaaye na tum.\nDoori ka ehsaas bhi,\nChubhta hai is dil ko.',
    'Kya pata kal kya ho,\nYeh zindagi ka safar hai.\nDarr hai kho na jaayein,\nJo mila hai yeh nagar hai.',
    'Khauf hai iss dil mein,\nKahin door na ho jaaye.\nSaath ho tumhara toh,\nHar mushkil aasaan ho jaaye.',
  ],
  neutral: [
    'Baaton ka safar jaari hai,\nDil ki baatien alfaaz mein dhalti hain.\nYunhi chalti rahein yeh baatein,\nHar mod par naya rang dikhati hain.',
    'Kuch baatein hain jo,\nKehni toh hain magar.\nSunn lo yaaron,\nDil ke hum sunte hain.',
    'Zindagi hai ek kitaab,\nHar kalma kuch kehti hai.\nAchha lagta hai jab,\nKoi humein padh leta hai.',
    'Yunhi chale aana ek din,\nMilke baatein karna.\nDil toh bahut khush hoga,\nAapko apna banana.',
  ],
  celebrate: [
    'Mubarak ho yeh khushi ka pal,\nYeh lamha hai pyara.\nDaastaan mein likhenge hum,\nYeh din hai sabse nyaara.',
    'Khushiyan milti hain toh,\nDil maange aur khushiyaan.\nHar pal mein basao khushi,\nZindagi hai pyaari.',
    'Udaan hai is khushi ki,\nAasmaan chhoot lo.\nMil gaya hai mauka toh,\nJeena seekh lo.',
  ],
  greeting: [
    'Salam hai dil se, mulaqaat ka mauka dein,\nMilke baatien karein, zindagi kitni khoob hai.\nYaadon ke jharokhe mein,\nBasa lo humein yunhi.',
    'Aapka din shubh rahe,\nKhushiyon mein doob rahe.\nYahi dua hai humari,\nMuskurahat se noor rahe.',
    'Kaise ho aap? Yeh sawaal hai,\nDil se puchta hoon.\nKhush ho toh zindagi rangeen hai,\nYaad humein bhi rakhte hain.',
  ],
};

const THEME_SHAYARI = {
  happy: 'Muskurahat hai toh duniya hai,\nMuskurahat hai toh khushi hai.',
  sad: 'Aansu bhi kehte hain kuch,\nDard bhi hai zubaan.',
  love: 'Aapki aankhon mein kho jaane ko dil chahta hai,\nAapki baaton mein doob jaane ko dil chahta hai.',
  romantic: 'Tumhari aankhon mein basa hua,\nEk jahaan hai.',
  angry: 'Gussa bhi kya cheez hai,\nDil ko jala deta hai.',
  fearful: 'Dar lagta hai iss mann ko,\nKahan kho jaaye na tum.',
  celebrate: 'Mubarak ho yeh khushi ka pal,\nYeh lamha hai pyara.',
  neutral: 'Baaton ka safar jaari hai,\nDil ki baatein alfaaz mein dhalti hain.',
};

async function getAIshayari(text, emotion) {
  try {
    const prompt = `Based on this conversation: "${text.slice(0, 500)}"\n\nEmotion: ${emotion}\n\nGenerate a beautiful Hindi/Urdu shayari (2-4 lines) that matches this emotion. Return ONLY the shayari text, no JSON, no other text.`;

    const result = await executeWithFallback(
      prompt,
      'You are a shayari generator. Generate only 2-4 lines of Hindi/Urdu shayari without any extra text or JSON formatting.',
      { timeout: 5000 }
    );

    const cleaned = result.replace(/```/g, '').replace(/[""]/g, '').trim();
    return cleaned || null;
  } catch (error) {
    logger.warn('AI shayari generation failed', { error: error.message });
    return null;
  }
}

async function getStaticShayari(emotion, count = 3) {
  const moodKey = emotion?.toLowerCase()?.trim() || 'neutral';

  let collection = SHAYARI_COLLECTION[moodKey];
  if (!collection) {
    for (const [key, shayaris] of Object.entries(SHAYARI_COLLECTION)) {
      if (moodKey.includes(key) || key.includes(moodKey)) {
        collection = shayaris;
        break;
      }
    }
  }
  if (!collection) collection = SHAYARI_COLLECTION.neutral;

  const shuffled = [...collection].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function getThemeShayari(emotion) {
  const moodKey = emotion?.toLowerCase()?.trim() || 'neutral';
  return THEME_SHAYARI[moodKey] || THEME_SHAYARI.neutral;
}

const CIL = require('../intelligence/conversationIntelligenceLayer');

async function getShayari(chatId, text, emotion = 'neutral', count = 3) {
  const recs = await CIL.getRecommendations(chatId);
  if (recs?.shayari?.suggestions?.length > 0) {
    const shayariTypes = recs.shayari.suggestions.slice(0, count);
    return shayariTypes.map((t) => THEME_SHAYARI[t] || getStaticShayari(t, 1)[0]).filter(Boolean);
  }

  const { results } = await parallelFetchAll([
    { name: 'ai', fn: () => getAIshayari(text, emotion), timeout: 8000 },
    { name: 'static', fn: getStaticShayari(emotion, count), timeout: 1000 },
  ]);

  const combined = results.slice(0, count);

  if (combined.length === 0) {
    return [THEME_SHAYARI[emotion] || THEME_SHAYARI.neutral];
  }

  return combined;
}

module.exports = {
  getShayari,
  getAIshayari,
  getStaticShayari,
  getThemeShayari,
  SHAYARI_COLLECTION,
  THEME_SHAYARI,
};
