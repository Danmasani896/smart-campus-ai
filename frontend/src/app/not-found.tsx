import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-state">
      <h1>That page isn’t on our map.</h1>
      <p>Let’s get you back to your campus workspace.</p>
      <Link className="btn btn-primary" href="/">
        Back to overview
      </Link>
    </div>
  );
}
