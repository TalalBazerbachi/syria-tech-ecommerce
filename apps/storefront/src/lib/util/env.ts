// Server-side only. `BASE_URL` is the runtime value set by docker-compose;
// `NEXT_PUBLIC_BASE_URL` (inlined at build time) serves local `next dev`.
export const getBaseURL = () => {
  return (
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:8001"
  )
}
