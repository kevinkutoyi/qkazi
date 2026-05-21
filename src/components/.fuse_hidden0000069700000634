type Role = "CUSTOMER" | "TASKER";

/**
 * Plain <a> on purpose: /api/auth/google is a server redirect, not a Next.js
 * page, so we want a full browser navigation rather than client-side routing.
 */
export default function GoogleButton({
  label = "Continue with Google",
  role,
}: {
  label?: string;
  role?: Role;
}) {
  const href = role ? `/api/auth/google?role=${role}` : "/api/auth/google";
  return (
    <a href={href} className="btn-secondary w-full">
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.2-5.5 4.2-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.4 14.6 2.4 12 2.4 6.6 2.4 2.2 6.8 2.2 12.2S6.6 22 12 22c6.9 0 9.6-4.8 9.6-7.3 0-.5-.1-.9-.1-1.3H12z"
        />
        <path
          fill="#4285F4"
          d="M21.5 12.3c0-.7-.1-1.2-.2-1.7H12v3.5h5.4c-.1.9-.7 2.2-2 3.1l3.1 2.4c1.9-1.8 3-4.4 3-7.3z"
        />
      </svg>
      {label}
    </a>
  );
}
