async function addLink() {
  const alias = document.getElementById('alias').value;
  const link = document.getElementById('link').value;

  const response = await fetch('/api/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ alias, link })
  });

  const data = await response.json();

  document.getElementById('result').textContent =
    JSON.stringify(data, null, 2);
}
