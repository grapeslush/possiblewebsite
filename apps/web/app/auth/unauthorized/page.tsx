export default function UnauthorizedPage() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-3xl font-semibold">Access denied</h1>
      <p className="mt-4 text-muted-foreground">
        You do not have permission to access this resource. Please contact an administrator if you
        believe this is an error.
      </p>
    </div>
  );
}
