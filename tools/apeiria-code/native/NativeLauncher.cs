using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

internal static class NativeLauncher {
    private static async Task Pump(Stream input, Stream output) {
        byte[] buffer = new byte[8192];
        while (true) {
            int count = await input.ReadAsync(buffer, 0, buffer.Length);
            if (count == 0) break;
            await output.WriteAsync(buffer, 0, count);
            await output.FlushAsync();
        }
    }
    private static string Quote(string value) {
        var result = new StringBuilder("\""); int slashes = 0;
        foreach (char character in value) {
            if (character == '\\') { slashes++; continue; }
            if (character == '"') { result.Append('\\', slashes * 2 + 1); result.Append(character); slashes = 0; continue; }
            result.Append('\\', slashes); slashes = 0; result.Append(character);
        }
        result.Append('\\', slashes * 2); result.Append('"'); return result.ToString();
    }
    public static int Main(string[] args) {
        try {
            string directory = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
            string node = Environment.GetEnvironmentVariable("APEIRIA_NATIVE_NODE");
            if (String.IsNullOrWhiteSpace(node)) node = File.ReadAllText(Path.Combine(directory, "node-path.txt")).Trim();
            if (!Path.IsPathRooted(node) || !File.Exists(node)) throw new Exception();
            var command = new StringBuilder(Quote(Path.Combine(directory, "native-runtime.cjs")));
            foreach (string arg in args) command.Append(" ").Append(Quote(arg));
            var info = new ProcessStartInfo(node, command.ToString()) {
                UseShellExecute = false, CreateNoWindow = true,
                RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true
            };
            info.EnvironmentVariables.Remove("NODE_OPTIONS"); info.EnvironmentVariables.Remove("NODE_PATH");
            string executable = Path.GetFileNameWithoutExtension(node);
            if (executable.Equals("Code", StringComparison.OrdinalIgnoreCase) || executable.Equals("Code - Insiders", StringComparison.OrdinalIgnoreCase)) info.EnvironmentVariables["ELECTRON_RUN_AS_NODE"] = "1";
            using (var process = Process.Start(info)) {
                Console.CancelKeyPress += delegate(object sender, ConsoleCancelEventArgs e) { e.Cancel = true; try { process.StandardInput.Close(); } catch { } };
                Task.Run(async delegate { try { await Pump(Console.OpenStandardInput(), process.StandardInput.BaseStream); process.StandardInput.Close(); } catch { } });
                Task output = Pump(process.StandardOutput.BaseStream, Console.OpenStandardOutput());
                Task error = Pump(process.StandardError.BaseStream, Console.OpenStandardError());
                process.WaitForExit(); Task.WaitAll(output, error); return process.ExitCode;
            }
        } catch {
            Console.Error.WriteLine("[Apeiria Code] 无法启动独立原生客户端内核，请重新安装本扩展。");
            return 1;
        }
    }
}
