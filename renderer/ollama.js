/* StudyMind Ollama Client and Mock Engine */

const OLLAMA_BASE = 'http://localhost:11434';

const Ollama = {
  isMockMode: false,
  selectedModel: 'tinyllama',
  maxTokens: 600,

  // Check if Ollama service is running
  async ping() {
    if (this.isMockMode) return true;
    
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000); // 2 second timeout
      
      const response = await fetch(`${OLLAMA_BASE}/api/tags`, { 
        method: 'GET',
        signal: controller.signal 
      });
      clearTimeout(id);
      return response.ok;
    } catch (err) {
      console.warn('Ollama connectivity ping failed:', err);
      return false;
    }
  },

  // Fetch list of locally installed models
  async getModels() {
    if (this.isMockMode) {
      return [
        { name: 'tinyllama:latest', details: { parameter_size: '1.1B' } },
        { name: 'phi3:latest', details: { parameter_size: '3.8B' } },
        { name: 'mock-academic-engine:latest', details: { parameter_size: '135M' } }
      ];
    }

    try {
      const response = await fetch(`${OLLAMA_BASE}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        return data.models || [];
      }
      return [];
    } catch (err) {
      console.error('Failed to fetch Ollama models:', err);
      return [];
    }
  },

  // Core Prompt Generation (Supports real NDJSON streaming and Mock streaming fallback)
  async generate(prompt, onChunk, onComplete, onError) {
    if (this.isMockMode) {
      this.generateMock(prompt, onChunk, onComplete);
      return;
    }

    try {
      const body = {
        model: this.selectedModel,
        prompt: prompt,
        stream: true,
        options: {
          num_predict: parseInt(this.maxTokens, 10),
          temperature: 0.7
        }
      };

      const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Ollama HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last partial line in the buffer
        buffer = lines.pop();

        for (const line of lines) {
          if (line.trim() === '') continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.response) {
              onChunk(parsed.response);
            }
          } catch (e) {
            console.warn('Failed to parse NDJSON line:', line, e);
          }
        }
      }

      // Parse remaining buffer
      if (buffer.trim() !== '') {
        try {
          const parsed = JSON.parse(buffer);
          if (parsed.response) onChunk(parsed.response);
        } catch (e) {}
      }

      onComplete();
    } catch (err) {
      console.error('Ollama stream generation failed:', err);
      onError(err);
    }
  },

  // Conversational Chat (Supports real NDJSON streaming of messages array and Mock streaming fallback)
  async chat(messages, onChunk, onComplete, onError) {
    if (this.isMockMode) {
      this.chatMock(messages, onChunk, onComplete);
      return;
    }

    try {
      const body = {
        model: this.selectedModel,
        messages: messages,
        stream: true,
        options: {
          num_predict: parseInt(this.maxTokens, 10),
          temperature: 0.7
        }
      };

      const response = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Ollama HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last partial line in the buffer
        buffer = lines.pop();

        for (const line of lines) {
          if (line.trim() === '') continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.message && parsed.message.content) {
              onChunk(parsed.message.content);
            }
          } catch (e) {
            console.warn('Failed to parse NDJSON line:', line, e);
          }
        }
      }

      // Parse remaining buffer
      if (buffer.trim() !== '') {
        try {
          const parsed = JSON.parse(buffer);
          if (parsed.message && parsed.message.content) {
            onChunk(parsed.message.content);
          }
        } catch (e) {}
      }

      onComplete();
    } catch (err) {
      console.error('Ollama stream chat failed:', err);
      onError(err);
    }
  },

  // Mock Conversational Chat Engine: generates extremely realistic human-like conversation responses
  chatMock(messages, onChunk, onComplete) {
    let responseText = '';
    
    // Find the last user message
    const userMessages = messages.filter(m => m.role === 'user');
    const lastUserMsg = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';
    const cleanPrompt = lastUserMsg.toLowerCase().trim();

    // Determine mock content based on prompt topics
    if (cleanPrompt === 'hello' || cleanPrompt === 'hi' || cleanPrompt === 'hey' || cleanPrompt === 'yo' || cleanPrompt.startsWith('hello') || cleanPrompt.startsWith('hi ')) {
      responseText = `Hi there! 👋 I'm StudyMind, your offline study companion. I'm ready to help you learn, review, or brainstorm. What topic or subject are we working on today?`;
    } 
    else if (cleanPrompt.includes('how are you') || cleanPrompt.includes('how\'s it going') || cleanPrompt.includes('how is it going') || cleanPrompt === 'kumusta') {
      responseText = `I'm doing great and feeling ready to learn! 📚 Thanks for asking. How is your study session going so far? Let me know what concepts you'd like to break down or practice!`;
    }
    else if (cleanPrompt.includes('who are you') || cleanPrompt.includes('what is your name') || cleanPrompt.includes('your name') || cleanPrompt.includes('tell me about yourself')) {
      responseText = `I am StudyMind, your personal offline AI study assistant and learning mentor! 🧠 I'm designed to help you understand tough topics, create customized practice quizzes, summarize your notes, and build flashcards. Think of me as a supportive study partner who is always ready to collaborate!`;
    }
    else if (cleanPrompt.includes('thank you') || cleanPrompt === 'thanks' || cleanPrompt === 'salamat' || cleanPrompt === 'ty') {
      responseText = `Anytime! I'm really glad I could help. 😊 Good luck with your studies, and let me know if you want to explore another topic or try a quick quiz!`;
    }
    else if (cleanPrompt === 'help' || cleanPrompt.includes('what can you do') || cleanPrompt.includes('how to use')) {
      responseText = `I'm here to support your study flow! Here's what we can do together:
   
*   💬 **Study Chat**: Ask me questions or discuss academic topics in detail.
*   📝 **Review Generator**: Select the reviewer tab to create customized multiple-choice tests, open-ended questions, or bullet summaries.
*   💡 **Topic Explainer**: Input any tricky concept to see analogies, misconceptions, or deep-dives.
*   🗂️ **Flashcards**: Build flashcard decks and practice active recall.
*   📓 **My Notes**: Keep your lecture notes organized and use the AI toolbar to edit or summarize them.

What would you like to start with?`;
    }
    else if (cleanPrompt.includes('water cycle') || cleanPrompt.includes('rain') || cleanPrompt.includes('evaporation') || cleanPrompt.includes('condensation') || cleanPrompt.includes('precipitation')) {
      responseText = `Ah, the **Water Cycle**! It's one of nature's most beautiful recycling systems. Here is a simple breakdown of the main stages:
     
1. **Evaporation ☀️**: The sun heats up water in rivers, lakes, or oceans and turns it into vapor or steam, which rises into the air.
2. **Condensation ☁️**: Water vapor in the air cools down and changes back into liquid, forming clouds.
3. **Precipitation 🌧️**: When so much water has condensed that the air cannot hold it anymore, the clouds get heavy and water falls back to the earth in the form of rain, snow, hail, or sleet.
4. **Collection ⛰️**: Water falls back to Earth as precipitation and gathers in oceans, lakes, and rivers, or is absorbed into the ground to become groundwater, starting the cycle all over again!

*Example Analogy*: Think of it like boiling water in a pot with a lid. The steam rises (evaporation), hits the cold lid and forms droplets (condensation), and drips back down into the pot (precipitation).

Does this explanation help? We could write a quick quiz on it if you'd like!`;
    } 
    else if (cleanPrompt.includes('photosynthesis') || cleanPrompt.includes('plants') || cleanPrompt.includes('chlorophyll')) {
      responseText = `I'd love to explain **Photosynthesis**! It's the incredible process by which green plants, algae, and some bacteria manufacture their own food using sunlight. 

Here is the simple scientific recipe plants use:
*   **Carbon Dioxide (CO2)** from the air.
*   **Water (H2O)** absorbed by the roots from the soil.
*   **Sunlight** captured by chlorophyll (the green pigment inside leaves).

**The chemical recipe:**
$$\\text{Carbon Dioxide} + \\text{Water} + \\text{Light Energy} \\rightarrow \\text{Glucose} (\\text{Sugar}) + \\text{Oxygen}$$

*   **Glucose**: The food/sugar that the plant uses for energy and growth.
*   **Oxygen (O2)**: Released back into the atmosphere as a byproduct, which we breathe!

*Analogy*: Imagine plant leaves as tiny solar panels combined with cooking kitchens. They take raw materials and use solar energy to bake energy cookies (sugar) while releasing clean air.

Isn't it amazing how plants support all life on Earth? Let me know if you want to quiz yourself on this!`;
    }
    else if (cleanPrompt.includes('world war 2') || cleanPrompt.includes('causes of ww2') || cleanPrompt.includes('wwii') || cleanPrompt.includes('world war ii')) {
      responseText = `Let's discuss **World War II (1939–1945)**. It was a global conflict that involved the vast majority of the world's countries. It is generally understood to have been caused by several intersecting historical forces:

*   **1. Treaty of Versailles (1919) ⚖️**: The harsh peace treaty ending World War I left Germany economically devastated and deeply humiliated, creating fertile ground for political extremism.
*   **2. Rise of Fascism and Adolf Hitler 🗳️**: Capitalizing on German anger, Adolf Hitler and the Nazi Party rose to power, preaching aggressive nationalism, expansionism, and racial supremacy.
*   **3. Appeasement Policy 🛡️**: Britain and France initially tried to avoid war by "appeasing" (giving in to) Hitler's early aggressive expansions, which only emboldened his ambitions.
*   **4. Failure of the League of Nations 🌐**: The international organization created after WWI had no real authority and failed to stop invasions by aggressive nations like Germany, Italy, and Japan.
*   **5. The Spark (Sept 1, 1939) ⚡**: World War II officially began when Germany invaded Poland, prompting Britain and France to finally declare war on Germany.

Would you like to focus on a specific theater of the war, like the Pacific or European fronts?`;
    }
    else if (cleanPrompt.includes('mitosis') || cleanPrompt.includes('meiosis') || cleanPrompt.includes('cell division')) {
      responseText = `Sure! Understanding **Mitosis vs. Meiosis** is super important in biology. They are two cell division processes with very different goals:

### 🟢 Mitosis (Growth & Repair)
*   **Goal**: Creates identical copies of a cell for growth, tissue repair, or asexual reproduction.
*   **Process**: One cell divides **once** to create **two** identical daughter cells.
*   **Chromosome Count**: Keeps the full set of chromosomes (called *diploid*, 46 chromosomes in humans).
*   *Key Phrase*: **Mitosis** happens in **My-Toes** (body cells).

### 🔴 Meiosis (Reproduction)
*   **Goal**: Creates unique sex cells (sperm and egg) for sexual reproduction.
*   **Process**: One cell divides **twice** to create **four** genetically unique daughter cells.
*   **Chromosome Count**: Halves the chromosome set so the baby gets half from mom and half from dad (called *haploid*, 23 chromosomes in humans).
*   *Key Phrase*: **Meiosis** makes **Me** (sex cells).

Which of these processes would you like to explore in more detail?`;
    } 
    else {
      // General fallbacks
      responseText = `I'd love to help you study that! Since I'm currently running in **Demo Mock Mode** (Ollama is offline or not running at http://localhost:11434), I don't have access to my full generative brain to write a custom response for **"${lastUserMsg.substring(0, 40)}"**.
     
Here are some tips for studying this topic:
*   **Identify key definitions**: Write down the central terms and concepts.
*   **Find real-world connections**: Try to connect this concept to something you already know.
*   **Explain it to a 5-year-old**: Use simple terms to test if you truly understand it.
     
To activate my full conversational AI, please start the Ollama service on your machine and make sure you've pulled a model like \`tinyllama\` (using \`ollama pull tinyllama\`). 
     
In the meantime, feel free to ask me about one of my preset topics, such as **Photosynthesis**, **World War 2**, **Mitosis vs Meiosis**, or the **Water Cycle**!`;
    }

    // Stream mock output word-by-word
    const words = responseText.split(' ');
    let index = 0;
    
    const interval = setInterval(() => {
      if (index >= words.length) {
        clearInterval(interval);
        onComplete();
        return;
      }
      
      const chunk = words[index] + ' ';
      onChunk(chunk);
      index++;
    }, 45); // ~13 words per second (very realistic speed)
  },

  // Mock Academic Generation Engine: generates extremely realistic streaming study answers
  generateMock(prompt, onChunk, onComplete) {
    let responseText = '';
    const cleanPrompt = prompt.toLowerCase();

    // Determine mock content based on prompt topics
    if (cleanPrompt.includes('water cycle') || cleanPrompt.includes('rain')) {
      responseText = `The **Water Cycle** (also known as the hydrologic cycle) is the continuous movement of water on, above, and below the surface of the Earth. Here is a simple breakdown of the main stages:

1. **Evaporation ☀️**: The sun heats up water in rivers, lakes, or oceans and turns it into vapor or steam, which rises into the air.
2. **Condensation ☁️**: Water vapor in the air cools down and changes back into liquid, forming clouds.
3. **Precipitation 🌧️**: When so much water has condensed that the air cannot hold it anymore, the clouds get heavy and water falls back to the earth in the form of rain, snow, hail, or sleet.
4. **Collection ⛰️**: Water falls back to Earth as precipitation and gathers in oceans, lakes, and rivers, or is absorbed into the ground to become groundwater, starting the cycle all over again!

*Example Analogy*: Think of it like boiling water in a pot with a lid. The steam rises (evaporation), hits the cold lid and forms droplets (condensation), and drips back down into the pot (precipitation).`;
    } 
    else if (cleanPrompt.includes('photosynthesis') || cleanPrompt.includes('plants')) {
      responseText = `**Photosynthesis** is the incredible process by which green plants, algae, and some bacteria manufacture their own food using sunlight. 

Here is the simple scientific recipe plants use:
*   **Carbon Dioxide (CO2)** from the air.
*   **Water (H2O)** absorbed by the roots from the soil.
*   **Sunlight** captured by chlorophyll (the green pigment inside leaves).

**The Recipe reaction:**
$$\\text{Carbon Dioxide} + \\text{Water} + \\text{Light Energy} \\rightarrow \\text{Glucose} (\\text{Sugar}) + \\text{Oxygen}$$

*   **Glucose**: The food/sugar that the plant uses for energy and growth.
*   **Oxygen (O2)**: Released back into the atmosphere as a byproduct, which we breathe!

*Analogy*: Imagine plant leaves as tiny solar panels combined with cooking kitchens. They take raw materials and use solar energy to bake energy cookies (sugar) while releasing clean air.`;
    }
    else if (cleanPrompt.includes('world war 2') || cleanPrompt.includes('causes of ww2') || cleanPrompt.includes('wwii')) {
      responseText = `**World War II (1939–1945)** was a global conflict that involved the vast majority of the world's countries. It is generally understood to have been caused by several intersecting historical forces:

*   **1. Treaty of Versailles (1919) ⚖️**: The harsh peace treaty ending World War I left Germany economically devastated and deeply humiliated, creating fertile ground for political extremism.
*   **2. Rise of Fascism and Adolf Hitler 🗳️**: Capitalizing on German anger, Adolf Hitler and the Nazi Party rose to power, preaching aggressive nationalism, expansionism, and racial supremacy.
*   **3. Appeasement Policy 🛡️**: Britain and France initially tried to avoid war by "appeasing" (giving in to) Hitler's early aggressive expansions, which only emboldened his ambitions.
*   **4. Failure of the League of Nations 🌐**: The international organization created after WWI had no real authority and failed to stop invasions by aggressive nations like Germany, Italy, and Japan.
*   **5. The Spark (Sept 1, 1939) ⚡**: World War II officially began when Germany invaded Poland, prompting Britain and France to finally declare war on Germany.`;
    }
    else if (cleanPrompt.includes('mitosis') || cleanPrompt.includes('meiosis')) {
      responseText = `**Mitosis vs. Meiosis** are two crucial cellular division processes in biology with very different goals:

### 🟢 Mitosis (Growth & Repair)
*   **Goal**: Creates identical copies of a cell for growth, tissue repair, or asexual reproduction.
*   **Process**: One cell divides **once** to create **two** identical daughter cells.
*   **Chromosome Count**: Keeps the full set of chromosomes (called *diploid*, 46 chromosomes in humans).
*   *Key Phrase*: **Mitosis** happens in **My-Toes** (body cells).

### 🔴 Meiosis (Reproduction)
*   **Goal**: Creates unique sex cells (sperm and egg) for sexual reproduction.
*   **Process**: One cell divides **twice** to create **four** genetically unique daughter cells.
*   **Chromosome Count**: Halves the chromosome set so the baby gets half from mom and half from dad (called *haploid*, 23 chromosomes in humans).
*   *Key Phrase*: **Meiosis** makes **Me** (sex cells).`;
    } 
    else if (cleanPrompt.includes('generate 5') || cleanPrompt.includes('multiple choice questions') || cleanPrompt.includes('mcq')) {
      // Mock review MCQ questions
      responseText = `Question 1: What is the main source of energy that drives the water cycle?
A) Earth's core heat
B) Wind currents
C) The Sun
D) Volcanic eruptions
Answer: C

Question 2: Which stage of the water cycle is responsible for the formation of clouds?
A) Evaporation
B) Condensation
C) Precipitation
D) Runoff
Answer: B

Question 3: What is the green pigment in plants that absorbs solar energy?
A) Mitochondria
B) Carotenoid
C) Chlorophyll
D) Cytoplasm
Answer: C

Question 4: What is the primary chemical product of photosynthesis used by plants as food?
A) Oxygen
B) Carbon Dioxide
C) Glucose
D) Water
Answer: C

Question 5: Which cell division process creates unique daughter cells with half the chromosomes?
A) Mitosis
B) Meiosis
C) Binary Fission
D) Synthesis
Answer: B`;
    }
    else if (cleanPrompt.includes('open-ended review questions') || cleanPrompt.includes('open-ended')) {
      responseText = `Q: What is the difference between evaporation and condensation?
A: Evaporation is the process where liquid water turns into gas (water vapor) due to heat. Condensation is the opposite, where water vapor cools and turns back into liquid water, forming clouds.

Q: Why was the League of Nations unable to prevent World War II?
A: The League of Nations lacked any military power, was not joined by the United States, and had weak enforcement capabilities, which prevented it from stopping aggressive invasions.

Q: What are the three primary inputs required for photosynthesis?
A: The three inputs are carbon dioxide (from the air), water (absorbed by roots), and sunlight (absorbed by chlorophyll).

Q: What is the biological goal of Mitosis?
A: The biological goal of mitosis is cell growth, tissue repair, and maintaining genetically identical diploid body cells.

Q: What is the initial event that officially sparked the outbreak of World War II?
A: The official outbreak of WWII was triggered by Nazi Germany's military invasion of Poland on September 1, 1939.`;
    }
    else if (cleanPrompt.includes('summarize') || cleanPrompt.includes('bullet form') || cleanPrompt.includes('bullet points')) {
      responseText = `• Evaporation is driven by solar heat, transforming surface water into rising gas.
• Condensation cools rising vapor, forming cloud systems.
• Precipitation returns condensed atmospheric water as rain, snow, or hail.
• Plants utilize sunlight, carbon dioxide, and water to perform photosynthesis.
• The photosynthetic reaction yields glucose for nutrition and releases oxygen.
• Mitosis replicates identical diploid body cells for biological growth.
• Meiosis yields unique haploid sex cells containing half the chromosomal counts.`;
    }
    else if (cleanPrompt.includes('study flow') || cleanPrompt.includes('planner') || cleanPrompt.includes('study steps')) {
      responseText = `Step 1: Previewing & Priming | Time: 15 | Goal: Quickly scan through the headers, diagrams, and bold terms in the lesson notes to build an initial mental map of the material.
Step 2: Core Concept Deep-Dive | Time: 30 | Goal: Read the main bodies of text closely. Identify the core components (like chemical ingredients or historical triggers) and sketch a quick flow-diagram.
Step 3: Interactive Practice & Recall | Time: 25 | Goal: Cover your notes and try to explain the core concepts aloud to yourself or solve active-recall review questions.
Step 4: Active Review & Summary | Time: 20 | Goal: Review the main summary outlines, check your quiz scores, and list any difficult terms in your notes to review tomorrow.`;
    }
    else {
      // General fallbacks
      responseText = `I am running in **Offline Mock Demo Mode** because Ollama is currently disconnected. Here is an academic overview of **"${prompt.replace(/You are StudyMind.*/, '').substring(0, 40)}..."**:

- **Core Definition**: This concept is central to academic studies. It represents a structured model that explains observed phenomena in natural or social systems.
- **Key Applications**: Used frequently by students to analyze structures, formulate thesis arguments, and review lessons.
- **Analogy**: Think of this concept like a building foundation—once you understand the core pillars, the upper structures are easy to build.

Please start Ollama in your background or run \`ollama run tinyllama\` to activate full live generative answers!`;
    }

    // Stream mock output word-by-word
    const words = responseText.split(' ');
    let index = 0;
    
    const interval = setInterval(() => {
      if (index >= words.length) {
        clearInterval(interval);
        onComplete();
        return;
      }
      
      const chunk = words[index] + ' ';
      onChunk(chunk);
      index++;
    }, 45); // ~13 words per second (very realistic speed)
  }
};
