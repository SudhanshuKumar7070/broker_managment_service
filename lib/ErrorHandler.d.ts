declare class ApiError extends Error {
    statusCode: number;
    errors: string[];
    data: null;
    constructor(statusCode: number, message?: string, errors?: string[], stack?: string);
}
export { ApiError };
//# sourceMappingURL=ErrorHandler.d.ts.map