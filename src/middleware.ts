export { default } from "next-auth/middleware"

export const config = {
  matcher: ["/dashboard/:path*", "/quiz/create/:path*", "/quiz/:id/results"],
}
