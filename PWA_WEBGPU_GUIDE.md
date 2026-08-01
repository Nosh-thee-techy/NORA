# NORA: Fully Local, Browser-Based AI Guide

NORA has been upgraded from a traditional server-dependent application to a **Progressive Web Application (PWA)** that runs a large language model directly inside your device's web browser using **WebGPU**.

This means zero cloud servers, zero subscription fees, and absolute privacy. Everything runs directly on the device you're holding.

Here is exactly how this architecture works, and how users can install it on their phones.

---

## 🧠 How the AI Runs in the Browser (WebGPU)

Typically, running an AI like Gemma requires a powerful cloud server or a complex local installation like Ollama. We bypass this entirely by using **WebGPU** and **WebLLM**.

### The Flow:
1. **First Visit**: When you navigate to the NORA website, the application interface loads.
2. **Model Download**: In the background, the app securely downloads a compressed (quantized) version of the Gemma AI model (`gemma-2-2b-it-q4`) directly from the Hugging Face model hub to your browser.
3. **IndexedDB Caching**: The model (~1.4 GB) is saved permanently in your browser's local storage database (IndexedDB). **It only downloads once.**
4. **GPU Acceleration**: When you chat with Nora, the browser uses **WebGPU**—a modern web standard that grants web apps direct, high-performance access to your device's graphics card. This allows the AI to generate text incredibly fast, right on your machine.

> [!TIP]
> **No WebGPU? No Problem.**
> If you are on an older device or an unsupported browser (like Firefox or Safari), NORA will gracefully fall back and attempt to connect to a local Ollama server if you have one running.

---

## 📱 How to Install NORA on Your Phone (PWA)

Because NORA is a Progressive Web Application with a built-in "Service Worker," you do not need to download it from the Apple App Store or Google Play Store. You install it directly from your web browser.

### On iOS (iPhone / iPad)
*Note: iOS currently limits WebGPU to experimental features, so AI inference on iOS may rely on future Safari updates or the Ollama fallback.*

1. Open the NORA website in **Safari**.
2. Tap the **Share** button (the square with an arrow pointing up at the bottom of the screen).
3. Scroll down the menu and tap **Add to Home Screen**.
4. Tap **Add** in the top right corner.
5. NORA will now appear on your home screen like a normal native app.

### On Android
*Note: Chrome for Android supports WebGPU natively.*

1. Open the NORA website in **Chrome**.
2. A prompt will often slide up automatically saying **"Add NORA to Home screen"**.
3. If the prompt doesn't appear, tap the **Three Dots (Menu)** in the top right corner.
4. Tap **Install app** or **Add to Home screen**.
5. NORA will now appear in your app drawer and home screen.

---

## 📴 100% Offline Capability

The magic of combining PWA with WebGPU is absolute offline independence.

- **The UI is Cached**: The Service Worker (`sw.js`) automatically saves all HTML, CSS, fonts, and images the moment you load the site.
- **The AI is Cached**: As mentioned, the WebLLM engine saves the Gemma model in IndexedDB.

Once you have visited the site once and the download progress bar finishes, **you can turn on Airplane Mode.**
If you open the NORA app from your home screen without Wi-Fi or cellular data, it will open instantly, the chat will work, and the AI will generate responses—all completely offline, ensuring maximum privacy for your health data.
