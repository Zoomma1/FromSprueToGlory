// Temporary workaround to add user info to Request type, set by auth middleware
declare namespace Express {
    export interface Request {
        userId?: string;
        userEmail?: string;
    }
}
