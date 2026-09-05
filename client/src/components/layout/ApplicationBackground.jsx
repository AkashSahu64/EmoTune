export default function ApplicationBackground({ children }) {
  return (
    <div className="min-h-screen bg-background dark:bg-background-dark" data-background-layer="application">
      {children}
    </div>
  );
}
