import { User, Role, Order, Message, Address, Zone } from "../types";

export let db: any = null;

const mapUserRole = (user: any): User => {
    if (!user) return user;
    let mappedRole = user.role;
    if (user.role === 'manager' || user.role === 'admin') mappedRole = Role.ADMIN;
    if (user.role === 'agent' || user.role === 'driver') mappedRole = Role.DRIVER;
    if (user.role === 'employee') mappedRole = Role.EMPLOYEE;
    if (user.role === 'customer') mappedRole = Role.CUSTOMER;
    if (user.role === 'observer') mappedRole = Role.OBSERVER;
    return {
        ...user,
        id: String(user.id),
        role: mappedRole
    };
};

let cachedToken: string | null = null;

export const setCachedToken = (token: string | null) => {
    if (token) {
        token = token.replace(/[^\x21-\x7E]/g, '');
        cachedToken = token;
        localStorage.setItem("al_tayyar_session_token", token);
    } else {
        cachedToken = null;
        localStorage.removeItem("al_tayyar_session_token");
    }
};

export const getCachedToken = (): string | null => {
    if (!cachedToken) {
        cachedToken = localStorage.getItem("al_tayyar_session_token");
        if (cachedToken) {
            // Strip any non-Latin1 or whitespace characters that could cause fetch header errors
            cachedToken = cachedToken.replace(/[^\x21-\x7E]/g, '');
        }
    }
    return cachedToken;
};

// Generic RPC fetcher
async function rpcCall(method: string, args: any[] = []): Promise<any> {
        const token = getCachedToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        
        try {
            const res = await fetch("/api/rpc", {
                method: "POST",
                headers,
                body: JSON.stringify({ method, args })
            });
        
        if (res.status === 401) {
            const hadToken = localStorage.getItem("al_tayyar_session_token");
            localStorage.removeItem("al_tayyar_user_id");
            localStorage.removeItem("al_tayyar_session_token");
            if (hadToken) {
                window.location.reload();
            }
            throw new Error("Session expired. Please log in again.");
        }
        
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "An error occurred while processing the request.");
        }
        
        return data.result;
    } catch (e: any) {
        let tokenDebug = "none";
        if (token) {
            tokenDebug = token.split('').map(c => `${c}(${c.charCodeAt(0)})`).join(' ');
        }
        console.error(`RPC Error [${method}]:`, e);
        console.error(`Token used (charcodes): ${tokenDebug}`);
        throw e;
    }
}

export const initializeDatabase = async () => {
    console.log("🚀 System client-side DB proxy initialized.");
};

export const getAllUsersFromDB = async (): Promise<User[]> => {
    const users = await rpcCall("getAllUsersFromDB");
    return Array.isArray(users) ? users.map(mapUserRole) : [];
};

export const getPaginatedUsersFromDB = async (page: number, limit: number): Promise<User[]> => {
    const users = await rpcCall("getAllUsersFromDB", [page, limit]);
    return Array.isArray(users) ? users.map(mapUserRole) : [];
};

export const getUsersCountFromDB = async (): Promise<number> => {
    return rpcCall("getUsersCountFromDB");
};

export const getPaginatedDriversFromDB = async (page: number, limit: number): Promise<User[]> => {
    const users = await rpcCall("getPaginatedDriversFromDB", [page, limit]);
    return Array.isArray(users) ? users.map(mapUserRole) : [];
};

export const getDriversCountFromDB = async (): Promise<number> => {
    return rpcCall("getDriversCountFromDB");
};

export const getPaginatedOrdersFromDB = async (page: number, limit: number, startDate?: number, endDate?: number, searchTerm?: string): Promise<Order[]> => {
    return rpcCall("getPaginatedOrdersFromDB", [page, limit, startDate, endDate, searchTerm]);
};

export const getOrdersCountFromDB = async (startDate?: number, endDate?: number, searchTerm?: string): Promise<number> => {
    return rpcCall("getOrdersCountFromDB", [startDate, endDate, searchTerm]);
};

export const getUserByIdFromDB = async (id: string): Promise<User | null> => {
    const user = await rpcCall("getUserByIdFromDB", [id]);
    return user ? mapUserRole(user) : null;
};

export const loginUserFromDB = async (phone: string, password: string): Promise<User | null> => {
    try {
        const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: phone.trim(), password })
        });
        const data = await res.json();
        
        if (!res.ok || !data.success) {
            if (data.message && data.message.includes("blocked")) {
                throw new Error(data.message);
            }
            return null;
        }
        
        if (data.token) {
            setCachedToken(data.token);
        }

        if (data.user) {
            return mapUserRole(data.user);
        }
        
        return null;
    } catch (e: any) {
        if (e.message && e.message.includes("blocked")) throw e;
        return null;
    }
};

export const updateUserProfileInDB = async (userId: string, name: string, phone: string): Promise<boolean> => {
    return rpcCall("updateUserProfileInDB", [userId, name, phone]);
};

export const adminUpdateUserInDB = async (userId: string, updates: Partial<User>): Promise<boolean> => {
    return rpcCall("adminUpdateUserInDB", [userId, updates]);
};

export const topUpWalletInDB = async (userId: string, amount: number): Promise<boolean> => {
    return rpcCall("topUpWalletInDB", [userId, amount]);
};

export const deductWalletInDB = async (userId: string, amount: number): Promise<boolean> => {
    return rpcCall("deductWalletInDB", [userId, amount]);
};

export const getPublicZonesFromDB = async (): Promise<Zone[]> => {
    try {
        const res = await fetch("/api/zones");
        const data = await res.json();
        if (data.success) {
            return data.result as Zone[];
        }
        return [];
    } catch (e) {
        console.error(e);
        return [];
    }
};

export const getZonesFromDB = async (): Promise<Zone[]> => {
    return rpcCall("getZonesFromDB");
};

export const createZoneInDB = async (zone: Zone): Promise<boolean> => {
    return rpcCall("createZoneInDB", [zone]);
};

export const updateZoneInDB = async (zone: Zone): Promise<boolean> => {
    return rpcCall("updateZoneInDB", [zone]);
};

export const deleteZoneInDB = async (zoneId: string): Promise<boolean> => {
    return rpcCall("deleteZoneInDB", [zoneId]);
};

export const addUserAddressInDB = async (userId: string, newAddress: Address, currentAddresses: Address[]) => {
    return rpcCall("addUserAddressInDB", [userId, newAddress, currentAddresses]);
};

export const cancelOrderInDB = async (orderId: string, timeline?: any[]): Promise<boolean> => {
    return rpcCall("cancelOrderInDB", [orderId, timeline]);
};

export const notifyDriverOfTrackingInDB = async (orderId: string, isTracking: boolean): Promise<boolean> => {
    return rpcCall("notifyDriverOfTrackingInDB", [orderId, isTracking]);
};

export const registerUserInDB = async (name: string, phone: string, password: string, address: string, zoneId: string): Promise<{ success: boolean; message?: string }> => {
    try {
        const res = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, phone, password, address, zoneId })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            return { success: false, message: data.message || "Registration failed" };
        }
        if (data.token) {
            setCachedToken(data.token);
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, message: "Error connecting to the server" };
    }
};

export const createUserWithRoleInDB = async (name: string, phone: string, password: string, role: Role): Promise<{ success: boolean; message?: string }> => {
    try {
        const token = getCachedToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetch("/api/create-user", {
            method: "POST",
            headers,
            body: JSON.stringify({ name, phone, password, role })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            return { success: false, message: data.message || "Failed to create user" };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, message: "Error connecting to the server" };
    }
};

export const createOrderInDB = async (order: Order): Promise<boolean> => {
    return rpcCall("createOrderInDB", [order]);
};

export const getAllOrdersFromDB = async (): Promise<Order[]> => {
    return rpcCall("getAllOrdersFromDB");
};

export const tryAcceptOrderInDB = async (orderId: string, driverId: string, timeline: any[]): Promise<boolean> => {
    return rpcCall("tryAcceptOrderInDB", [orderId, driverId, timeline]);
};

export const updateOrderStatusInDB = async (
    orderId: string,
    status: string,
    timeline: any[],
    driverId?: string,
    proofImageUrl?: string,
    delayReason?: string,
    requestingDriverId?: string
): Promise<boolean> => {
    return rpcCall("updateOrderStatusInDB", [orderId, status, timeline, driverId, proofImageUrl, delayReason, requestingDriverId]);
};

export const rejectCancellationInDB = async (orderId: string, timeline?: any[]): Promise<boolean> => {
    return rpcCall("rejectCancellationInDB", [orderId, timeline]);
};

export const requestCancellationInDB = async (orderId: string, requesterId: string, reason: string, timeline?: any[]): Promise<boolean> => {
    return rpcCall("requestCancellationInDB", [orderId, requesterId, reason, timeline]);
};

export const updateUserPasswordInDB = async (userId: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
    try {
        const token = getCachedToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetch("/api/change-password", {
            method: "POST",
            headers,
            body: JSON.stringify({ userId, oldPassword, newPassword })
        });
        const data = await res.json();
        return { success: !!data.success, message: data.message };
    } catch (e) {
        return { success: false, message: "Connection error" };
    }
};

export const updateUserLocationInDB = async (userId: string, lat: number, lng: number, lastMovedAt?: number, lastSeenAt?: number) => {
    return rpcCall("updateUserLocationInDB", [userId, lat, lng, lastMovedAt, lastSeenAt]);
};

export const updateUserStatusInDB = async (userId: string, isOnline: boolean): Promise<boolean> => {
    return rpcCall("updateUserStatusInDB", [userId, isOnline]);
};

export const submitOrderRatingInDB = async (orderId: string, rating: number, comment: string): Promise<boolean> => {
    return rpcCall("submitOrderRatingInDB", [orderId, rating, comment]);
};

export const updateLocationPulseForAdminInDB = async (adminId: string) => {
    return rpcCall("updateLocationPulseForAdminInDB", [adminId]);
};

export const sendMessageInDB = async (msg: Message): Promise<boolean> => {
    return rpcCall("sendMessageInDB", [msg]);
};

export const getMessagesFromDB = async (orderId: string): Promise<Message[]> => {
    return rpcCall("getMessagesFromDB", [orderId]);
};

export const getRecentMessagesFromDB = async (since: number): Promise<Message[]> => {
    return rpcCall("getRecentMessagesFromDB", [since]);
};

export const triggerPushNotification = async (targetUserId: string, title: string, body: string, data?: Record<string, string>) => {
    try {
        const token = getCachedToken();
        await fetch("/api/notify", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                ...(token ? { "Authorization": `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ targetUserId, title, body, data })
        });
    } catch (e) {
        console.error("Push trigger failed:", e);
    }
};

export const registerZoneWaitlistInDB = async (zoneId: string, phone: string, email?: string, name?: string): Promise<{ success: boolean; message?: string }> => {
    try {
        const res = await fetch("/api/zone-waitlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ zoneId, phone, email, name })
        });
        return await res.json();
    } catch (e) {
        console.error("Failed to register waitlist:", e);
        return { success: false, message: "Network error" };
    }
};

export const getZoneWaitlistFromDB = async (): Promise<any[]> => {
    return rpcCall("getZoneWaitlistFromDB");
};
