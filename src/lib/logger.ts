enum LogLevel {
    all = 5,
    trace = 4,
    debug = 3,
    info = 2,
    warn = 1,
    error = 0
}

interface LoggerConfig {
    debugMode: boolean
    logLevel: LogLevel
    target: string | "all"
    currenttarget: string | "all"
}

export default class Logger {
    private static instance: Logger
    private constructor(public loggerConfig: LoggerConfig) {
    }

    public static getInstance(target: string) {
        if (!Logger.instance) {
            Logger.instance = new Logger({
                debugMode: true,
                logLevel: 2,
                target: "all",
                currenttarget: "all"
            })
        }
        Logger.instance.setCurrentTarget(target)
        return Logger.instance
    }

    private setCurrentTarget(target: string) {
        this.loggerConfig.currenttarget = target
    }

    private validateLog(currentLogLevel: number) {
        const validateLogLevel = currentLogLevel <= this.loggerConfig.logLevel
        const validateTarge = this.loggerConfig.currenttarget === this.loggerConfig.target || "all"

        return this.loggerConfig.debugMode && validateLogLevel && validateTarge
    }

    info(message: string, ...obj: unknown[]) {
        console.log(obj)
        if (this.validateLog(LogLevel.info)) {
            console.info("%c" + this.loggerConfig.currenttarget + ":", "color: black;background-color: green;padding:1px", message, ...obj)
        }
    }
    warn(message: string, ...obj: unknown[]) {
        if (this.validateLog(LogLevel.warn)) {
            console.warn(this.loggerConfig.currenttarget + ":", message, ...obj)
        }
    }
    error(message: string, ...obj: unknown[]) {
        if (this.validateLog(LogLevel.error)) {
            console.error("%c" + this.loggerConfig.currenttarget + ":", message, ...obj)
        }
    }
    trace(message: string, ...obj: unknown[]) {
        if (this.validateLog(LogLevel.trace)) {
            console.trace("%c" + this.loggerConfig.currenttarget + ":", message, ...obj)
        }
    }

}