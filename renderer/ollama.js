/* StudyMind Ollama Client and Mock Engine */

const OLLAMA_BASE = 'http://127.0.0.1:11434';

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

      if (buffer.trim() !== '') {
        try {
          const parsed = JSON.parse(buffer);
          if (parsed.response) onChunk(parsed.response);
        } catch (e) {}
      }

      onComplete();
    } catch (err) {
      console.warn('Ollama stream generation failed, falling back to mock:', err);
      
      // Auto fallback to mock mode
      this.isMockMode = true;
      if (window.showToast) {
        window.showToast('Local AI offline. Switched to Demo Mock Mode.', 'warning');
      }
      
      // Update sidebar status
      const connectionDot = document.getElementById('connection-dot');
      const connectionText = document.getElementById('connection-text');
      if (connectionDot) {
        connectionDot.className = 'status-dot';
        connectionDot.style.backgroundColor = 'var(--warning)';
        connectionDot.style.boxShadow = '0 0 10px var(--warning)';
      }
      if (connectionText) connectionText.textContent = 'Mock Engine (Demo)';

      // Run mock fallback
      this.generateMock(prompt, onChunk, onComplete);
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
      console.warn('Ollama stream chat failed, falling back to mock:', err);
      
      // Auto fallback to mock mode
      this.isMockMode = true;
      if (window.showToast) {
        window.showToast('Local AI offline. Switched to Demo Mock Mode.', 'warning');
      }
      
      const connectionDot = document.getElementById('connection-dot');
      const connectionText = document.getElementById('connection-text');
      if (connectionDot) {
        connectionDot.className = 'status-dot';
        connectionDot.style.backgroundColor = 'var(--warning)';
        connectionDot.style.boxShadow = '0 0 10px var(--warning)';
      }
      if (connectionText) connectionText.textContent = 'Mock Engine (Demo)';

      this.chatMock(messages, onChunk, onComplete);
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
    }, 15);
  },

  // Mock Academic Generation Engine: generates extremely realistic streaming study answers
  generateMock(prompt, onChunk, onComplete) {
    // Split prompt to search for action keywords only in instruction part, ignoring pasted notes content
    const notesIndex = prompt.toLowerCase().lastIndexOf('notes:');
    const noteContentIndex = prompt.toLowerCase().lastIndexOf('note content:');
    
    let instructionPart = prompt.toLowerCase();
    let pastedNotes = '';
    
    if (notesIndex !== -1) {
      instructionPart = prompt.substring(0, notesIndex).toLowerCase();
      pastedNotes = prompt.substring(notesIndex + 6).trim();
    } else if (noteContentIndex !== -1) {
      instructionPart = prompt.substring(0, noteContentIndex).toLowerCase();
      pastedNotes = prompt.substring(noteContentIndex + 13).trim();
    }

    // Detect target language from the instruction/prompt
    let language = 'english';
    if (instructionPart.includes('taglish')) {
      language = 'taglish';
    } else if (instructionPart.includes('filipino') || instructionPart.includes('tagalog')) {
      language = 'filipino';
    }

    // Helper to extract terms and definitions from notes
    function parseTermsAndDefinitions(text) {
      const pairs = [];
      if (!text) return pairs;
      
      // Standardize newlines
      let processedText = text.replace(/\r\n/g, '\n');
      
      // Preprocess: split smashed lines (e.g. "computer.RAM (Random Access Memory) - ")
      processedText = processedText.replace(/([a-z0-9])\.([A-Z][a-zA-Z0-9\s()'"-]{1,100}?\s*(?:[\u2012\u2013\u2014\-:=]|\b(?:is|are)\b))/g, '$1.\n$2');
      
      const lines = processedText.split('\n');
      let currentQ = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const qMatch = line.match(/^(?:Q|Question|Tanong)\s*\d*[:.-]\s*(.+)$/i);
        const aMatch = line.match(/^(?:A|Answer|Sagot|Ans)\s*\d*[:.-]\s*(.+)$/i);
        
        if (qMatch) {
          currentQ = qMatch[1].trim();
        } else if (aMatch && currentQ) {
          pairs.push({ term: aMatch[1].trim(), def: currentQ });
          currentQ = ''; // Reset
          continue;
        }
        
        // Alternative: If a line ends with '?' and the next non-empty line starts with A/Answer/Ans or is just a short line
        if (line.endsWith('?') && !qMatch) {
          let nextLine = '';
          let nextIdx = i + 1;
          while (nextIdx < lines.length && !nextLine) {
            nextLine = lines[nextIdx].trim();
            nextIdx++;
          }
          if (nextLine) {
            const nextAMatch = nextLine.match(/^(?:A|Answer|Sagot|Ans)?\s*[:.-]?\s*(.+)$/i);
            if (nextAMatch) {
              const ansText = nextAMatch[1].trim();
              // Make sure it doesn't look like another question
              if (!ansText.endsWith('?')) {
                pairs.push({ term: ansText, def: line });
                i = nextIdx - 1; // Advance loop past the answer line
                continue;
              }
            }
          }
        }
      }
      
      // 2. If we didn't find Q&A structures, parse line-by-line using dashes/colons/equals
      if (pairs.length === 0) {
        for (let line of lines) {
          line = line.trim();
          if (!line || line.startsWith('#')) continue;
          
          // Match separator: dash, colon, or equals
          const parts = line.split(/\s*(?:[\u2012\u2013\u2014\-:=]|\b(?:is|are)\b)\s*/i);
          if (parts.length >= 2) {
            const left = parts[0].replace(/^[-*•\d\.\s]+/, '').trim();
            const right = parts.slice(1).join(' ').trim();
            
            if (left.length > 1 && right.length > 1) {
              // Heuristic to decide term vs definition
              const leftIsQuestion = /\?$/i.test(left) || /\b(what|how|why|who|where|when|which|define|explain|identify|describe)\b/i.test(left);
              const rightIsQuestion = /\?$/i.test(right) || /\b(what|how|why|who|where|when|which|define|explain|identify|describe)\b/i.test(right);
              
              if (leftIsQuestion && !rightIsQuestion) {
                pairs.push({ term: right, def: left });
              } else if (rightIsQuestion && !leftIsQuestion) {
                pairs.push({ term: left, def: right });
              } else {
                // If neither is a question, compare lengths
                const leftWords = left.split(/\s+/).length;
                const rightWords = right.split(/\s+/).length;
                if (leftWords > rightWords) {
                  pairs.push({ term: right, def: left }); // Left is longer description
                } else {
                  pairs.push({ term: left, def: right }); // Right is longer description
                }
              }
            }
          }
        }
      }
      
      // Deduplicate
      const seen = new Set();
      const uniquePairs = [];
      for (const p of pairs) {
        const key = p.term.toLowerCase() + '|||' + p.def.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          uniquePairs.push(p);
        }
      }
      return uniquePairs;
    }

    // --- Preset Databases (Multilingual) ---
    // Science
    const sciencePairs = [
      { term: "Photosynthesis", def: "The process by which green plants manufacture glucose and oxygen using sunlight, water, and carbon dioxide." },
      { term: "Chlorophyll", def: "The green pigment in plants that absorbs solar energy for photosynthesis." },
      { term: "Glucose", def: "The primary chemical product of photosynthesis used by plants as food and energy source." },
      { term: "Mitochondria", def: "The powerhouses of the cell that generate ATP through cellular respiration." },
      { term: "Stomata", def: "Tiny pores on plant leaves that allow carbon dioxide to enter and oxygen to exit." }
    ];
    const sciencePairsFilipino = [
      { term: "Photosynthesis", def: "Ang proseso kung saan ang mga berdeng halaman ay gumagawa ng pagkain gamit ang sikat ng araw, tubig, at carbon dioxide." },
      { term: "Chlorophyll", def: "Ang berdeng pigment sa mga halaman na sumisipsip ng enerhiya mula sa araw upang magamit sa photosynthesis." },
      { term: "Glucose", def: "Ang pangunahing produkto ng photosynthesis na nagsisilbing pagkain at enerhiya ng halaman." },
      { term: "Mitochondria", def: "Ang mga powerhouse ng selula na gumagawa ng ATP sa pamamagitan ng cellular respiration." },
      { term: "Stomata", def: "Ang mga maliliit na butas sa dahon na nagpapahintulot sa pagpasok ng carbon dioxide at paglabas ng oxygen." }
    ];
    const sciencePairsTaglish = [
      { term: "Photosynthesis", def: "Ang process kung saan ang green plants ay gumagawa ng sariling food gamit ng sunlight, water, at carbon dioxide." },
      { term: "Chlorophyll", def: "Ang green pigment sa plants na nag-aabsorb ng solar energy para sa photosynthesis." },
      { term: "Glucose", def: "Ang primary food product ng photosynthesis na ginagamit ng plants for energy at growth." },
      { term: "Mitochondria", def: "Ang powerhouse ng cell na nag-ge-generate ng ATP through cellular respiration." },
      { term: "Stomata", def: "Ang mga tiny pores sa leaves na daanan ng carbon dioxide at oxygen." }
    ];

    // Water Cycle
    const waterPairs = [
      { term: "Evaporation", def: "The process where liquid water turns into gas (water vapor) due to heat." },
      { term: "Condensation", def: "The phase where rising water vapor cools down and changes back into liquid, forming clouds." },
      { term: "Precipitation", def: "The release of water from clouds back to earth as rain, snow, hail, or sleet." },
      { term: "Collection", def: "The gathering of fallen water in oceans, lakes, and rivers, or ground absorption." },
      { term: "Transpiration", def: "The process of water movement through a plant and its evaporation from leaves." }
    ];
    const waterPairsFilipino = [
      { term: "Evaporation", def: "Ang proseso kung saan ang likidong tubig ay nagiging gas o singaw dahil sa init ng araw." },
      { term: "Condensation", def: "Ang yugto kung saan lumalamig ang singaw ng tubig at nagiging likido muli upang bumuo ng mga ulap." },
      { term: "Precipitation", def: "Ang pagbagsak ng tubig mula sa mga ulap sa anyo ng ulan, yelo, o niyebe." },
      { term: "Collection", def: "Ang pag-ipon ng tubig-ulan sa mga karagatan, lawa, at ilog, o pagsipsip nito sa lupa." },
      { term: "Transpiration", def: "Ang paggalaw at paglabas ng singaw ng tubig mula sa mga halaman patungo sa atmospera." }
    ];
    const waterPairsTaglish = [
      { term: "Evaporation", def: "Ang process kung saan ang liquid water ay nagiging gas or water vapor dahil sa heat." },
      { term: "Condensation", def: "Ang phase kung saan lumalamig ang water vapor sa hangin at nagiging liquid uli, na nagfo-form ng clouds." },
      { term: "Precipitation", def: "Ang pagbagsak ng tubig mula sa clouds sa anyo ng ulan, snow, or hail." },
      { term: "Collection", def: "Ang pag-gather ng tubig sa mga oceans, lakes, at rivers, or pag-absorb nito sa ground." },
      { term: "Transpiration", def: "Ang process ng pag-move ng water sa loob ng plant at pag-evaporate nito mula sa leaves." }
    ];

    // Cell division
    const cellPairs = [
      { term: "Mitosis", def: "Cell division resulting in two identical diploid body cells for growth and tissue repair." },
      { term: "Meiosis", def: "Cell division resulting in four unique haploid sex cells/gametes for reproduction." },
      { term: "Diploid", def: "A cell containing two complete sets of chromosomes, one from each parent." },
      { term: "Haploid", def: "A cell containing a single set of unpaired chromosomes, typical of gametes." },
      { term: "Chromosomes", def: "Threadlike structures of nucleic acids and protein found in the nucleus, carrying genetic information." }
    ];
    const cellPairsFilipino = [
      { term: "Mitosis", def: "Ang paghahati ng selula na nagreresulta sa dalawang magkatulad na diploid na selula para sa paglaki at pagkumpuni ng tissue." },
      { term: "Meiosis", def: "Ang paghahati ng selula na nagreresulta sa apat na natatanging haploid na sex cell para sa reproduksyon." },
      { term: "Diploid", def: "Isang selula na may dalawang kumpletong hanay ng mga kromosom, isa mula sa bawat magulang." },
      { term: "Haploid", def: "Isang selula na may isang solong hanay ng mga kromosom, karaniwan sa mga gamete." },
      { term: "Chromosomes", def: "Ang mga threadlike structure sa loob ng nucleus na nagdadala ng impormasyong genetiko." }
    ];
    const cellPairsTaglish = [
      { term: "Mitosis", def: "Ang cell division na nagpo-produce ng dalawang identical diploid cells para sa growth at tissue repair." },
      { term: "Meiosis", def: "Ang cell division na nagreresulta sa apat na unique haploid gametes o sex cells para sa reproduction." },
      { term: "Diploid", def: "Isang cell na naglalaman ng dalawang complete sets ng chromosomes, galing sa mother at father." },
      { term: "Haploid", def: "Isang cell na may single set ng unpaired chromosomes, tulad ng sperm at egg cells." },
      { term: "Chromosomes", def: "Ang threadlike structures sa nucleus na nagdadala ng genetic information ng organismo." }
    ];

    // History
    const historyPairs = [
      { term: "Treaty of Versailles", def: "The harsh 1919 peace treaty ending World War I that left Germany economically devastated." },
      { term: "Fascism", def: "A dictatorial political ideology characterized by extreme nationalism and expansionism." },
      { term: "Appeasement", def: "The policy of making concessions to aggressive powers to avoid conflict, used by Britain and France." },
      { term: "League of Nations", def: "The weak international organization created after WWI that failed to prevent military invasions." },
      { term: "Invasion of Poland", def: "The Nazi Germany military action on September 1, 1939, that officially sparked World War II." }
    ];
    const historyPairsFilipino = [
      { term: "Treaty of Versailles", def: "Ang kasunduan sa kapayapaan noong 1919 na nagtapos sa Unang Digmaang Pandaigdig na nagpahirap sa ekonomiya ng Alemanya." },
      { term: "Fascism", def: "Isang diktatoryal na ideolohiyang politikal na may matinding nasyonalismo at militarismo." },
      { term: "Appeasement", def: "Ang patakaran ng pagbibigay sa mga kahilingan ng agresibong bansa upang maiwasan ang digmaan." },
      { term: "League of Nations", def: "Ang mahinang organisasyong pang-internasyonal na itinatag pagkatapos ng WWI na nabigong pigilan ang WWII." },
      { term: "Invasion of Poland", def: "Ang pag-atake ng Alemanya noong Setyembre 1, 1939 na opisyal na nagpasimula sa Ikalawang Digmaang Pandaigdig." }
    ];
    const historyPairsTaglish = [
      { term: "Treaty of Versailles", def: "Ang peace treaty noong 1919 na nag-end sa World War I na nag-iwan sa Germany na lubhang naghihirap sa ekonomiya." },
      { term: "Fascism", def: "Isang dictatorial political ideology na may extreme nationalism at aggressive expansionism." },
      { term: "Appeasement", def: "Ang policy ng pag-concede sa aggressive powers para maiwasan ang war, ginamit ng Britain at France." },
      { term: "League of Nations", def: "Ang weak international organization pagkatapos ng WWI na nag-fail pigilan ang mga invasion." },
      { term: "Invasion of Poland", def: "Ang military action ng Germany noong Sept 1, 1939 na opisyal na nag-spark sa World War II." }
    ];

    // General Fallbacks
    const generalPairs = [
      { term: "Mitochondria", def: "Organelle known as the powerhouse of the cell, generating chemical energy (ATP)." },
      { term: "Mitosis", def: "Cell division process that yields two genetically identical diploid cells." },
      { term: "Evaporation", def: "Thermal process converting surface liquid water into rising atmospheric water vapor." },
      { term: "Photosynthesis", def: "Process using light energy to synthesize glucose and oxygen from carbon dioxide and water." },
      { term: "Treaty of Versailles", def: "The peace agreement ending World War I which imposed harsh financial reparations on Germany." }
    ];
    const generalPairsFilipino = [
      { term: "Mitochondria", def: "Organelle na kilala bilang powerhouse ng selula, na gumagawa ng ATP para sa enerhiya." },
      { term: "Mitosis", def: "Proseso ng paghahati ng selula na lumilikha ng dalawang magkatulad na diploid na selula." },
      { term: "Evaporation", def: "Proseso ng pagbabago ng likidong tubig patungong gas dahil sa init." },
      { term: "Photosynthesis", def: "Proseso kung saan ang mga halaman ay gumagawa ng pagkain gamit ang liwanag ng araw." },
      { term: "Treaty of Versailles", def: "Ang kasunduan sa kapayapaan na nagtapos sa Unang Digmaang Pandaigdig." }
    ];
    const generalPairsTaglish = [
      { term: "Mitochondria", def: "Organelle na powerhouse ng cell, nagpo-produce ng ATP for chemical energy." },
      { term: "Mitosis", def: "Ang process ng cell division na nag-ge-generate ng dalawang identical body cells." },
      { term: "Evaporation", def: "Thermal process kung saan ang water ay nagiging water vapor at sumasama sa hangin." },
      { term: "Photosynthesis", def: "Process ng paggawa ng food ng plants gamit ang sunlight, carbon dioxide, at water." },
      { term: "Treaty of Versailles", def: "Ang kasunduan na nag-end sa World War I na nagpataw ng heavy penalties sa Germany." }
    ];

    // Select the fallback database based on language and topic matching
    let fallbackPairs = generalPairs;
    if (language === 'filipino') {
      fallbackPairs = generalPairsFilipino;
      if (instructionPart.includes('water cycle') || instructionPart.includes('rain') || pastedNotes.toLowerCase().includes('water cycle')) {
        fallbackPairs = waterPairsFilipino;
      } else if (instructionPart.includes('photosynthesis') || instructionPart.includes('plant') || pastedNotes.toLowerCase().includes('photosynthesis')) {
        fallbackPairs = sciencePairsFilipino;
      } else if (instructionPart.includes('mitosis') || instructionPart.includes('meiosis') || instructionPart.includes('cell division') || pastedNotes.toLowerCase().includes('mitosis')) {
        fallbackPairs = cellPairsFilipino;
      } else if (instructionPart.includes('world war') || instructionPart.includes('ww2') || instructionPart.includes('wwii') || pastedNotes.toLowerCase().includes('world war')) {
        fallbackPairs = historyPairsFilipino;
      }
    } else if (language === 'taglish') {
      fallbackPairs = generalPairsTaglish;
      if (instructionPart.includes('water cycle') || instructionPart.includes('rain') || pastedNotes.toLowerCase().includes('water cycle')) {
        fallbackPairs = waterPairsTaglish;
      } else if (instructionPart.includes('photosynthesis') || instructionPart.includes('plant') || pastedNotes.toLowerCase().includes('photosynthesis')) {
        fallbackPairs = sciencePairsTaglish;
      } else if (instructionPart.includes('mitosis') || instructionPart.includes('meiosis') || instructionPart.includes('cell division') || pastedNotes.toLowerCase().includes('mitosis')) {
        fallbackPairs = cellPairsTaglish;
      } else if (instructionPart.includes('world war') || instructionPart.includes('ww2') || instructionPart.includes('wwii') || pastedNotes.toLowerCase().includes('world war')) {
        fallbackPairs = historyPairsTaglish;
      }
    } else {
      fallbackPairs = generalPairs;
      if (instructionPart.includes('water cycle') || instructionPart.includes('rain') || pastedNotes.toLowerCase().includes('water cycle')) {
        fallbackPairs = waterPairs;
      } else if (instructionPart.includes('photosynthesis') || instructionPart.includes('plant') || pastedNotes.toLowerCase().includes('photosynthesis')) {
        fallbackPairs = sciencePairs;
      } else if (instructionPart.includes('mitosis') || instructionPart.includes('meiosis') || instructionPart.includes('cell division') || pastedNotes.toLowerCase().includes('mitosis')) {
        fallbackPairs = cellPairs;
      } else if (instructionPart.includes('world war') || instructionPart.includes('ww2') || instructionPart.includes('wwii') || pastedNotes.toLowerCase().includes('world war')) {
        fallbackPairs = historyPairs;
      }
    }

    // Parse pasted notes. If no terms are found, only then default to fallback database.
    let pairs = parseTermsAndDefinitions(pastedNotes);
    if (pairs.length === 0) {
      pairs = fallbackPairs;
    }

    // Retrieve requested question limit from the instructions
    let numQ = 5;
    const numQMatch = instructionPart.match(/generate\s+(?:exactly\s+)?(\d+)/i);
    if (numQMatch) {
      numQ = parseInt(numQMatch[1], 10);
    }

    function shuffleArray(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
      }
    }

    // MCQ generator (always asks for terms/answers based on definitions/questions)
    function generateMCQ(pairs, count) {
      const mcqs = [];
      const n = Math.min(count, pairs.length);
      
      for (let i = 0; i < n; i++) {
        const current = pairs[i];
        
        let questionText = '';
        let correctAnswer = current.term;
        const choices = [];
        
        if (language === 'filipino') {
          questionText = `Aling termino ang tumutukoy sa: "${current.def}"?`;
        } else if (language === 'taglish') {
          questionText = `Aling term ang tumutukoy sa: "${current.def}"?`;
        } else {
          questionText = `Which term matches this description: "${current.def}"?`;
        }
        
        const others = pairs.filter(p => p.term !== current.term).map(p => p.term);
        shuffleArray(others);
        choices.push(correctAnswer);
        for (let j = 0; j < Math.min(3, others.length); j++) {
          choices.push(others[j]);
        }
        
        while (choices.length < 4) {
          const padIdx = choices.length + 1;
          if (language === 'filipino') {
            choices.push(`Alternatibong termino ${padIdx}`);
          } else if (language === 'taglish') {
            choices.push(`Alternative term ${padIdx}`);
          } else {
            choices.push(`Alternative concept/term ${padIdx}`);
          }
        }
        
        shuffleArray(choices);
        
        const letters = ['A', 'B', 'C', 'D'];
        const idx = choices.indexOf(correctAnswer);
        const correctLetter = letters[idx];
        
        mcqs.push({
          num: i + 1,
          question: questionText,
          choices: {
            A: choices[0],
            B: choices[1],
            C: choices[2],
            D: choices[3]
          },
          answer: correctLetter
        });
      }
      
      let resultText = '';
      for (const q of mcqs) {
        resultText += `Question ${q.num}: ${q.question}\n`;
        resultText += `A) ${q.choices.A}\n`;
        resultText += `B) ${q.choices.B}\n`;
        resultText += `C) ${q.choices.C}\n`;
        resultText += `D) ${q.choices.D}\n`;
        resultText += `Answer: ${q.answer}\n\n`;
      }
      return resultText.trim();
    }

    // Open-Ended Q&A generator with multilingual support
    function generateOpenEnded(pairs, count) {
      const qaPairs = [];
      const n = Math.min(count, pairs.length);
      
      for (let i = 0; i < n; i++) {
        const current = pairs[i];
        let q = '';
        let a = '';
        if (language === 'filipino') {
          q = `Maaari mo bang ipaliwanag ang kahulugan ng "${current.term}"?`;
          a = `${current.def}`;
        } else if (language === 'taglish') {
          q = `Paki-explain kung ano ang meaning ng "${current.term}"?`;
          a = `${current.def}`;
        } else {
          q = `Explain the concept of "${current.term}" and outline its significance based on the study materials.`;
          a = `${current.def}`;
        }
        qaPairs.push({ question: q, answer: a });
      }
      
      let resultText = '';
      for (const q of qaPairs) {
        resultText += `Q: ${q.question}\n`;
        resultText += `A: ${q.answer}\n\n`;
      }
      return resultText.trim();
    }

    // Flashcard generator with multilingual support
    function generateFlashcards(pairs, count) {
      const cards = [];
      const n = Math.min(count, pairs.length);
      
      for (let i = 0; i < n; i++) {
        const current = pairs[i];
        let f = '';
        let b = '';
        if (language === 'filipino') {
          f = `Kahulugan: ${current.def}`;
          b = `Termino: ${current.term}`;
        } else if (language === 'taglish') {
          f = `Definition: ${current.def}`;
          b = `Term: ${current.term}`;
        } else {
          f = `${current.def}`;
          b = `${current.term}`;
        }
        cards.push({ front: f, back: b });
      }
      
      let resultText = '';
      for (const c of cards) {
        resultText += `FRONT: ${c.front}\n`;
        resultText += `BACK: ${c.back}\n\n`;
      }
      return resultText.trim();
    }

    // Reviewer generator with improvised three-section Study Guide format
    function generateReviewer(pairs) {
      if (pairs.length === 0) {
        return `### 1. Core Summary & Key Takeaways\nNo study concepts were found to summarize.\n\n### 2. Key Vocabulary Glossary\nGlossary is empty.\n\n### 3. Self-Test Practice Q&A\nNo practice questions available.`;
      }

      const termsList = pairs.map(p => p.term).join(', ');
      
      let summarySection = '';
      let glossarySection = '';
      let qaSection = '';

      if (language === 'filipino') {
        summarySection = `### 1. Core Summary & Key Takeaways\nAng gabay na ito ay naglalaman ng mahahalagang konsepto tulad ng: ${termsList}. Mahalagang maunawaan kung paano nag-uugnay ang bawat isa upang lubos na maintindihan ang paksa.`;
        
        glossarySection = `### 2. Key Vocabulary Glossary\n`;
        for (const pair of pairs) {
          glossarySection += `• **${pair.term}** — Kahulugan: ${pair.def}\n`;
        }

        qaSection = `### 3. Self-Test Practice Q&A\n`;
        const testCount = Math.min(3, pairs.length);
        for (let i = 0; i < testCount; i++) {
          const pair = pairs[i];
          qaSection += `**Tanong ${i + 1}**: Ano ang ibig sabihin ng ${pair.term}?\n**Sagot**: ${pair.def}\n\n`;
        }
      } else if (language === 'taglish') {
        summarySection = `### 1. Core Summary & Key Takeaways\nThis reviewer covers the main topics including: ${termsList}. It highlights the relationship and core components within the subject.`;
        
        glossarySection = `### 2. Key Vocabulary Glossary\n`;
        for (const pair of pairs) {
          glossarySection += `• **${pair.term}** — Meaning: ${pair.def}\n`;
        }

        qaSection = `### 3. Self-Test Practice Q&A\n`;
        const testCount = Math.min(3, pairs.length);
        for (let i = 0; i < testCount; i++) {
          const pair = pairs[i];
          qaSection += `**Q${i + 1}**: Ano ang definition ng ${pair.term}?\n**A**: ${pair.def}\n\n`;
        }
      } else {
        summarySection = `### 1. Core Summary & Key Takeaways
This comprehensive Study Guide provides a structured breakdown of the core subject matter. The material focuses on the relationships, definitions, and functions of: ${termsList}. Understanding these terms is essential for mastering the fundamental concepts of the lesson.`;
        
        glossarySection = `### 2. Key Vocabulary Glossary\n`;
        for (const pair of pairs) {
          glossarySection += `• **${pair.term}** — ${pair.def}\n`;
        }

        qaSection = `### 3. Self-Test Practice Q&A\n`;
        const testCount = Math.min(3, pairs.length);
        for (let i = 0; i < testCount; i++) {
          const pair = pairs[i];
          qaSection += `**Q${i + 1}**: What is the definition/concept of **${pair.term}**?\n**A**: ${pair.def}\n\n`;
        }
      }

      return `${summarySection}\n\n${glossarySection}\n${qaSection}`.trim();
    }

    // Determine the generated response text based on the instruction section of the prompt
    let responseText = '';
    if (instructionPart.includes('multiple choice questions') || instructionPart.includes('mcq')) {
      responseText = generateMCQ(pairs, numQ);
    }
    else if (instructionPart.includes('open-ended review questions') || instructionPart.includes('open-ended')) {
      responseText = generateOpenEnded(pairs, numQ);
    }
    else if (instructionPart.includes('flashcard')) {
      responseText = generateFlashcards(pairs, numQ);
    }
    else if (instructionPart.includes('formatted study reviewer') || instructionPart.includes('reviewer guide')) {
      responseText = generateReviewer(pairs);
    }
    else if (instructionPart.includes('study flow') || instructionPart.includes('planner') || instructionPart.includes('study steps')) {
      responseText = `Step 1: Previewing & Priming | Time: 15 | Goal: Quickly scan through the headers, diagrams, and bold terms in the lesson notes to build an initial mental map of the material.
Step 2: Core Concept Deep-Dive | Time: 30 | Goal: Read the main bodies of text closely. Identify the core components (like chemical ingredients or historical triggers) and sketch a quick flow-diagram.
Step 3: Interactive Practice & Recall | Time: 25 | Goal: Cover your notes and try to explain the core concepts aloud to yourself or solve active-recall review questions.
Step 4: Active Review & Summary | Time: 20 | Goal: Review the main summary outlines, check your quiz scores, and list any difficult terms in your notes to review tomorrow.`;
    }
    else if (instructionPart.includes('summarize') || instructionPart.includes('bullet form') || instructionPart.includes('bullet points') || instructionPart.includes('summary')) {
      let resultText = '';
      for (const pair of pairs) {
        resultText += `• **${pair.term}**: ${pair.def}\n`;
      }
      responseText = resultText.trim();
    }
    else {
      // General fallbacks
      let termSummary = '';
      if (pairs.length > 0) {
        termSummary = `\n\nHere are some identified core topics:\n` + pairs.map(p => `- **${p.term}**: ${p.def}`).join('\n');
      }
      responseText = `I am running in **Offline Mock Demo Mode** because Ollama is currently disconnected. Here is an academic overview of your study notes:${termSummary}

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
    }, 15); // ~66 words per second (very responsive speed)
  }
};

// Global Auto JSON Notes parsing and saving utility
window.AutoJsonNotes = {
  parse(text) {
    const pairs = [];
    if (!text) return pairs;
    
    // Standardize newlines
    let processedText = text.replace(/\r\n/g, '\n');
    
    // Preprocess smashed lines
    processedText = processedText.replace(/([a-z0-9])\.([A-Z][a-zA-Z0-9\s()'"-]{1,100}?\s*(?:[\u2012\u2013\u2014\-:=]|\b(?:is|are)\b))/g, '$1.\n$2');
    
    const lines = processedText.split('\n');
    let currentQ = '';
    
    // 1. Try matching Q: / A: or Question: / Answer: pattern across lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const qMatch = line.match(/^(?:Q|Question|Tanong)\s*\d*[:.-]\s*(.+)$/i);
      const aMatch = line.match(/^(?:A|Answer|Sagot|Ans)\s*\d*[:.-]\s*(.+)$/i);
      
      if (qMatch) {
        currentQ = qMatch[1].trim();
      } else if (aMatch && currentQ) {
        pairs.push({ term: aMatch[1].trim(), def: currentQ });
        currentQ = ''; // Reset
        continue;
      }
      
      // Alternative: If a line ends with '?' and the next non-empty line starts with A/Answer/Ans or is just a short line
      if (line.endsWith('?') && !qMatch) {
        let nextLine = '';
        let nextIdx = i + 1;
        while (nextIdx < lines.length && !nextLine) {
          nextLine = lines[nextIdx].trim();
          nextIdx++;
        }
        if (nextLine) {
          const nextAMatch = nextLine.match(/^(?:A|Answer|Sagot|Ans)?\s*[:.-]?\s*(.+)$/i);
          if (nextAMatch) {
            const ansText = nextAMatch[1].trim();
            // Make sure it doesn't look like another question
            if (!ansText.endsWith('?')) {
              pairs.push({ term: ansText, def: line });
              i = nextIdx - 1; // Advance loop past the answer line
              continue;
            }
          }
        }
      }
    }
    
    // 2. If we didn't find Q&A structures, parse line-by-line using dashes/colons/equals
    if (pairs.length === 0) {
      for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#') || line.length < 5) continue;
        
        // Match separator: dash, colon, or equals or copula
        const parts = line.split(/\s*(?:[\u2012\u2013\u2014\-:=]|\b(?:is|are)\b)\s*/i);
        if (parts.length >= 2) {
          const left = parts[0].replace(/^[-*•\d\.\s]+/, '').trim();
          const right = parts.slice(1).join(' ').trim();
          
          if (left.length > 1 && right.length > 1) {
            // Heuristic to decide term vs definition
            const leftIsQuestion = /\?$/i.test(left) || /\b(what|how|why|who|where|when|which|define|explain|identify|describe)\b/i.test(left);
            const rightIsQuestion = /\?$/i.test(right) || /\b(what|how|why|who|where|when|which|define|explain|identify|describe)\b/i.test(right);
            
            if (leftIsQuestion && !rightIsQuestion) {
              pairs.push({ term: right, def: left });
            } else if (rightIsQuestion && !leftIsQuestion) {
              pairs.push({ term: left, def: right });
            } else {
              // If neither is a question, compare lengths
              const leftWords = left.split(/\s+/).length;
              const rightWords = right.split(/\s+/).length;
              if (leftWords > rightWords) {
                pairs.push({ term: right, def: left }); // Left is longer description
              } else {
                pairs.push({ term: left, def: right }); // Right is longer description
              }
            }
          }
        }
      }
    }
    
    // Deduplicate
    const seen = new Set();
    const uniquePairs = [];
    for (const p of pairs) {
      const key = p.term.toLowerCase() + '|||' + p.def.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniquePairs.push(p);
      }
    }
    return uniquePairs;
  },

  async parseAndSave(text) {
    const pairs = this.parse(text);
    const jsonStr = JSON.stringify(pairs, null, 2);
    if (window.api && window.api.saveJsonNotes) {
      try {
        await window.api.saveJsonNotes(jsonStr);
      } catch (err) {
        console.error('AutoJsonNotes: Failed to write notes.json:', err);
      }
    }
    return pairs;
  }
};
