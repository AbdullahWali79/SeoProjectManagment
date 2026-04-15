"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { loginAction, type LoginState } from "@/app/actions";

const initialState: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="button button-primary btn btn-warning w-100" disabled={pending}>
      {pending ? "Signing in..." : "Open dashboard"}
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="grid">
      <div className="field">
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" className="input form-control" defaultValue="admin@agency.local" />
      </div>

      <div className="field">
        <label className="label" htmlFor="password">
          Password
        </label>
        <input id="password" name="password" type="password" className="input form-control" defaultValue="Passw0rd!" />
      </div>

      {state.error ? (
        <div
          className="notice"
          style={{
            background: "rgba(185,28,28,0.1)",
            color: "#991b1b",
            borderColor: "rgba(185,28,28,0.18)",
          }}
        >
          {state.error}
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}
