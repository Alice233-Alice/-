using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

internal static class Launcher {
    private static async Task Pump(Stream input, Stream output) {
        byte[] buffer = new byte[4096];
        while (true) {
            int count = await input.ReadAsync(buffer, 0, buffer.Length);
            if (count == 0) break;
            await output.WriteAsync(buffer, 0, count);
            await output.FlushAsync();
        }
    }
    private static string Quote(string s) {
        var b = new StringBuilder("\""); int slashes = 0;
        foreach (char c in s) {
            if (c == '\\') { slashes++; continue; }
            if (c == '"') { b.Append('\\', slashes * 2 + 1); b.Append(c); slashes = 0; continue; }
            b.Append('\\', slashes); slashes = 0; b.Append(c);
        }
        b.Append('\\', slashes * 2); b.Append('"'); return b.ToString();
    }
    public static int Main(string[] args) {
        try {
            if (args.Length == 1 && (args[0] == "--protect" || args[0] == "--unprotect")) {
                string input = Console.In.ReadToEnd();
                if (args[0] == "--protect") Console.Out.Write(Convert.ToBase64String(ProtectedData.Protect(Encoding.UTF8.GetBytes(input), null, DataProtectionScope.CurrentUser)));
                else Console.Out.Write(Encoding.UTF8.GetString(ProtectedData.Unprotect(Convert.FromBase64String(input.Trim()), null, DataProtectionScope.CurrentUser)));
                return 0;
            }
            string self = Assembly.GetExecutingAssembly().Location;
            string directory = Path.GetDirectoryName(self);
            string node = File.ReadAllText(Path.Combine(directory, "node-path.txt")).Trim();
            var command = new StringBuilder(Quote(Path.Combine(directory, "router.cjs")));
            foreach (string arg in args) command.Append(" ").Append(Quote(arg));
            var info = new ProcessStartInfo(node, command.ToString()) {
                UseShellExecute = false, CreateNoWindow = true,
                RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true
            };
            info.EnvironmentVariables["CODEX_SWITCHBOARD_LAUNCHER"] = self;
            using (var process = Process.Start(info)) {
                Console.CancelKeyPress += delegate(object sender, ConsoleCancelEventArgs e) { e.Cancel = true; try { process.Kill(); } catch { } };
                Task.Run(async delegate { try { await Pump(Console.OpenStandardInput(), process.StandardInput.BaseStream); process.StandardInput.Close(); } catch { } });
                Task output = Pump(process.StandardOutput.BaseStream, Console.OpenStandardOutput());
                Task error = Pump(process.StandardError.BaseStream, Console.OpenStandardError());
                process.WaitForExit(); Task.WaitAll(output, error); return process.ExitCode;
            }
        } catch {
            Console.Error.WriteLine("[模型渠道] 启动或凭证加密失败。官网登录未更改。");
            return 1;
        }
    }
}
