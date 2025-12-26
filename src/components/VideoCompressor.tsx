import { useEffect, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { Upload, Download, Video } from "lucide-react";

export function VideoCompressor() {
  const ffmpegRef = useRef(new FFmpeg());
  const [loaded, setLoaded] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string>("");

  // Carrega o FFmpeg (uma única vez)
  const loadFFmpeg = async () => {
    if (loaded) return;

    await ffmpegRef.current.load({
      corePath: "/ffmpeg/ffmpeg-core.js",
    });

    setLoaded(true);
  };

  useEffect(() => {
    loadFFmpeg();
  }, []);

  const processVideo = async () => {
    if (!file || !loaded) return;

    setProcessing(true);
    setOutputUrl("");

    const ffmpeg = ffmpegRef.current;

    // Nome seguro
    const inputName = "input.mp4";
    const outputName = "output.mp4";

    // Escreve o vídeo no FFmpeg
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    /**
     * 🎯 CONFIGURAÇÃO DE COMPRESSÃO
     * - 720p
     * - 30fps
     * - até ~8MB (ótimo p/ WhatsApp e Reels)
     */
    await ffmpeg.exec([
      "-i",
      inputName,
      "-vf",
      "scale=1280:-2",
      "-r",
      "30",
      "-b:v",
      "800k",
      "-preset",
      "veryfast",
      "-movflags",
      "+faststart",
      outputName,
    ]);

    // Lê o resultado
    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer], { type: "video/mp4" });
    const url = URL.createObjectURL(blob);

    setOutputUrl(url);
    setProcessing(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-3xl p-[1px] bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 shadow-lg">
        <div className="bg-white rounded-3xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
            <Video className="w-6 h-6 text-violet-600" />
            Compressor de Vídeo
          </h3>

          {!file && (
            <label className="block border-3 border-dashed rounded-2xl p-10 text-center cursor-pointer hover:border-violet-400">
              <Upload className="w-14 h-14 mx-auto text-violet-600 mb-4" />
              <p className="font-semibold text-gray-800">
                Selecione um vídeo (MP4)
              </p>
              <input
                type="file"
                accept="video/mp4"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="text-sm text-gray-500 mt-2">
                Ideal para WhatsApp, Reels e Stories
              </p>
            </label>
          )}

          {file && (
            <div className="space-y-4">
              <p className="text-gray-700">
                🎬 <strong>{file.name}</strong>
              </p>

              <button
                onClick={processVideo}
                disabled={processing}
                className="w-full text-white py-3 rounded-xl font-semibold bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 hover:opacity-95"
              >
                {processing ? "Comprimindo vídeo..." : "Comprimir Vídeo"}
              </button>

              {outputUrl && (
                <>
                  <video
                    src={outputUrl}
                    controls
                    className="w-full rounded-xl border"
                  />

                  <a
                    href={outputUrl}
                    download="video_comprimido.mp4"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600"
                  >
                    <Download className="w-5 h-5" />
                    Baixar vídeo
                  </a>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
