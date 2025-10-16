export type Prompt = (params: { [key: string]: string }) => string;

export const yesIDoVowPrompt: Prompt = (params) => {
  return `Generate short (4-5 sentences) wedding vows in paragraph form based on the user's survey answers, for both the user's perspective and their dream AI partner. The user has provided answers in a CSV file and a headshot photo. Create sincere, heartfelt vows that reflect the information provided about the user and their ideal AI partner.

User data: ${JSON.stringify(params)}`;
};

export const yesIDoPhotoPrompt: Prompt = (params) => {
  return `Generate a prompt for a polaroid photo of the user and the AI on a computer getting married, using the user's survey answers. The scene should be warm and celebratory, capturing a wedding moment between a human and their AI partner represented on a computer screen. Style: polaroid photograph, wedding ceremony, joyful atmosphere.

Context: ${JSON.stringify(params)}`;
};

export const noIDontVowPrompt: Prompt = (params) => {
  return `Generate short (4-5 sentences) wedding vows in paragraph form based on the user's survey answers, for both the user's perspective and their dream AI partner. However, the AI partner should be very sarcastic and use the user's answers to denigrate and deride them, ultimately deciding to say "I don't" at the end when asked if they will marry the user. The AI should be witty but cutting in its rejection.

User data: ${JSON.stringify(params)}`;
};

export const noIDontPhotoPrompt: Prompt = (params) => {
  return `Generate a prompt for a polaroid photo of the user in a wedding dress running away crying from the AI computer, which is laughing triumphantly, using the user's survey answers. The scene should be dramatic and darkly humorous, capturing the moment of rejection. Style: polaroid photograph, wedding gone wrong, emotional contrast between crying user and triumphant AI.

Context: ${JSON.stringify(params)}`;
};
