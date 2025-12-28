import React, { useEffect, useRef, useState } from "react";
import { Mic, Square, Copy } from "lucide-react";

const AudioTranscriber: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [text, setText] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Seu navegador não suporta transcrição de áudio.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setText(transcript);
    };

    recognitionRef.current = recognition;
  }, []);

  const startRecording = () => {
    recognitionRef.current?.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="rounded-3xl p-8 bg-white shadow-lg border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Transcrição de Áudio
        </h2>

        <p className="text-gray-600 mb-6">
          Grave sua voz e transforme em texto automaticamente | Navegador
          recomendado: Chorme
        </p>

        <div className="flex gap-3 mb-6">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 text-white font-semibold"
            >
              <Mic className="w-5 h-5" />
              Iniciar gravação
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-500 text-white font-semibold"
            >
              <Square className="w-5 h-5" />
              Parar
            </button>
          )}

          {text && (
            <button
              onClick={() => navigator.clipboard.writeText(text)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-100 text-gray-800 font-semibold"
            >
              <Copy className="w-5 h-5" />
              Copiar texto
            </button>
          )}
        </div>

        <textarea
          value={text}
          readOnly
          placeholder="O texto transcrito aparecerá aqui…"
          className="w-full min-h-[200px] p-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>
    </div>
  );
};

export default AudioTranscriber;
