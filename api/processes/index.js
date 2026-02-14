import { loadStore } from '../lib/store.js';
import { requireAuth } from '../lib/auth.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const branch = requireAuth(req, res);
  if (!branch) return;

  const { search, category, page = '1', limit = '20' } = req.query;
  const store = loadStore();

  let docs = [...store.documents];

  if (search) {
    const s = search.toLowerCase();
    docs = docs.filter(
      (d) =>
        d.title.toLowerCase().includes(s) ||
        (d.content_text && d.content_text.toLowerCase().includes(s))
    );
  }

  if (category && category !== 'All') {
    docs = docs.filter((d) => d.category === category);
  }

  docs.sort((a, b) => a.title.localeCompare(b.title));

  const total = docs.length;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;
  const paged = docs.slice(offset, offset + limitNum);

  // Strip content_text from list results
  const documents = paged.map(({ content_text, ...rest }) => rest);

  res.json({
    documents,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
}
