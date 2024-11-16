export function isCommandSafe(command) {
    const dangerousPatterns = [
        /\brm\s+-rf\s+\/\b/, // rm -rf /
        /\brm\s+-rf\b/, // rm -rf
        /\b(reboot|poweroff|shutdown|halt|init\s+[06])\b/,
        /\bkill\s+-9\s+1\b/, // kill -9 1
        /\bkill\s+-9\s+0\b/,
        /\bkillall\b/,
        /\bdd\s+if=.*\b/,
        /\bmkfs\b/,
        /\byes\s+>\s+\/dev\/sda\b/,
        /\bchmod\s+000\s+\/\b/,
        /\bchown\b/,
        /\bsudo\s+rm\b/,
        /\bsudo\s+reboot\b/,
        /\b>:.*\/dev\/.*\b/, // redirect to /dev devices
        /\bdd\b/,
        /\bsystemctl\s+reboot\b/,
        /\bsystemctl\s+poweroff\b/,
        /\b:(){:|:&};:\b/, // fork bombs
        /\beval\s+["'].*["']\b/, // dangerous evals
        /\b>.*\/dev\/(sda|sdb|sd[a-z])\b/,
        /\bformat\b/,
        /\bdel\s+\/f\s+\/s\s+\/q\s+C:\\\b/, // Windows dangerous commands
        /\bnet\s+user\b/,
        /\brm\b.*--no-preserve-root\b/,
        // Add more dangerous patterns here
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(command)) {
            return false;
        }
    }

    return true;
}