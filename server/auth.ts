import { RequestHandler } from "express";
import { storage } from "./storage";

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      role: "admin" | "member" | "non member";
    }
  }
}

// Middleware to check if user is authenticated
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Middleware to check if user is admin
export const isAdmin: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    if (req.user?.role === "admin") {
      return next();
    }
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Middleware to check if user is accessing their own data or is admin
export const isOwnerOrAdmin = (paramName: string = "id"): RequestHandler => {
  return async (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user?.id;
    const requestedId = req.params[paramName];

    // Admins can access any data
    if (req.user?.role === "admin") {
      return next();
    }

    // Members can only access their own data
    const member = await storage.getMemberByUserId(userId!);
    if (member && (member.id === requestedId || member.userId === requestedId)) {
      return next();
    }

    res.status(403).json({ message: "Forbidden: You can only access your own data" });
  };
};
