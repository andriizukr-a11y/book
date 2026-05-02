export default async function handler(req, res) {
  // Визначаємо проєкт за параметром або за замовчуванням
  const project = req.query.project || 'links1';
  
  // Мапінг проєктів на репозиторії
  const projectMap = {
    'links1': 'andriizukr-a11y/Links1',
    'links2': 'andriizukr-a11y/Links2'
  };
  
  const repo = projectMap[project] || projectMap['links1'];
  const url = `https://api.github.com/repos/${repo}/contents/bookmarks.xbel`;
  
  console.log(`[API] Завантаження для проєкту: ${project}, repo: ${repo}`);

  const response = await fetch(url, {
    headers: {
      "Accept": "application/vnd.github.raw"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    console.error(`[API] Помилка завантаження: ${response.status}`);
    return res.status(response.status).send('Помилка завантаження з GitHub');
  }

  const text = await response.text();
  console.log(`[API] Завантажено ${text.length} символів для ${project}`);

  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(text);
}
