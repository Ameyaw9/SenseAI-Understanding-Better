#SenseAI - Understanding Better Through AI

SenseAI is a multimodal AI tutor designed to bridge the gap between complex technical concepts and accessibility. By leveraging the latest Google Gemini models, it provides a complete sensory learning experience through deep reasoning, audio synthesis, and visual generation. It is specifically engineered to be inclusive, offering specialized "Spatial Descriptions" that translate visual data into navigational language for the visually impaired.

## 🔗 Project Resources

| Resource | Link |
|----------|------|
| **📺 Video Demo** | [Watch on YouTube](https://youtu.be/RL9N7bZ2DL0) |
| **📑 Project Deck** | [View Presentation on Canva](https://www.canva.com/design/DAG7M0INy2U/bjVQpIKZtbPN8BCmleUwDw/edit) |

---

## ✨ Key Features

### 🧠 Deep Reasoning
Utilizes **Gemini 3 Pro** to deconstruct complex academic topics and architectures into structured, step-by-step explanations. It moves beyond simple summarization to provide pedagogical deep dives.

### 🗺️ Spatial Accessibility
A core innovation of SenseAI. The system generates dedicated **Spatial Descriptions** alongside visual content. These descriptions translate 2D flowcharts and diagrams into logical, directional text (e.g., "The data flows from top-left to center..."), enabling blind users to build a mental map of the visual information.

### 🗣️ Multimodal Synthesis
SenseAI engages all senses for better retention:
- **Visual**: Generates high-contrast schematic diagrams on the fly using `gemini-2.5-flash-image`.
- **Auditory**: Converts explanations into natural-sounding speech using `gemini-2.5-flash-preview-tts`.
- **Verbal**: Supports full voice interaction with accurate speech-to-text transcription.

### ⚡ Real-time Voice Interaction
Replaces standard browser speech recognition with **Gemini 2.5 Flash** for superior transcription accuracy, allowing users to ask complex technical questions naturally using their voice.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **AI Integration**: Google GenAI SDK (`@google/genai`)
- **Models Used**:
  - `gemini-3-pro-preview`: Logic, reasoning, and JSON structure generation.
  - `gemini-2.5-flash`: Audio transcription and fast text processing.
  - `gemini-2.5-flash-image`: Schematic diagram generation.
  - `gemini-2.5-flash-preview-tts`: Text-to-Speech synthesis.

---

## 🚀 How It Works

1.  **User Input**: The user asks a question via text or microphone.
2.  **Transcription**: Audio is sent to Gemini Flash to be transcribed into text.
3.  **Orchestration**: The query is sent to Gemini 3 Pro with a specialized system instruction to return a JSON object containing:
    -   A Markdown-formatted technical explanation.
    -   A specific prompt for generating a diagram.
    -   A spatial accessibility description.
4.  **Parallel Generation**:
    -   The **Explanation** is rendered immediately.
    -   The **Image Prompt** is sent to the image model to generate a flowchart.
    -   The **Text** is sent to the TTS model to generate audio.
5.  **Presentation**: All modalities (Text, Audio, Image) are presented in a unified, accessible interface.

---

## 📦 Getting Started

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/sense-ai.git
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure API Key**
    Ensure your `process.env.API_KEY` is set with a valid Google Gemini API key.

4.  **Run the application**
    ```bash
    npm start
    ```

---

*Built with ❤️ for the Google Gemini Developer Competition.*
