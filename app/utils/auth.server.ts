import { createCookieSessionStorage, json, redirect } from "@remix-run/node";
import { prisma } from "./prisma.server";
import type { LoginForm, RegisterForm } from "./types.server";
import { createUser } from "./users.server";
import bcrypt from "bcryptjs";

const secret = process.env.SESSION_SECRET;
if (!secret) {
  throw new Error("SESSION_SECRET is not set");
}

const storage = createCookieSessionStorage({
  cookie: {
    name: "kudos-session",
    secure: process.env.NODE_ENV == "production",
    secrets: [secret],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
  },
});

//Create new user
export const register = async (form: RegisterForm) => {
  //count return 1 or 0 like a boolean
  const exists = await prisma.user.count({ where: { email: form.email } });

  if (exists) {
    return json(
      { error: "User already exist with this email" },
      { status: 400 }
    );
  }

  //create user
  const newUser = await createUser(form);

  if (!newUser) {
    return json(
      {
        error: `Something went wrong during the new user creation process`,
        fields: { email: form.email, password: form.password },
      },
      { status: 400 }
    );
  }
  return createUserSession(newUser.id, "/");
};

//login

export const login = async (form: LoginForm) => {
  const user = await prisma.user.findUnique({
    where: { email: form.email },
  });

  if (!user || !(await bcrypt.compare(form.password, user.password))) {
    return json(
      {
        error: "incorrect login",
      },
      { status: 400 }
    );
  }
  return createUserSession(user.id, "/");
};
//create User Session
export const createUserSession = async (userId: string, redirectTo: string) => {
  const session = await storage.getSession();
  session.set("userId", userId);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
};
