export default async function ShellPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  return (
    <>
      <p id="page-path">/{slug.join('/')}</p>
      <input id="page-input" aria-label="Page input" />
    </>
  );
}
