// index.js
import express from 'express';
import cors from 'cors';
import supabase from './supabaseClient.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// GET - Ambil semua produk
app.get('/products', async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select('*');
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.status(200).json(data);
});

// POST - Buat produk baru
app.post('/products', async (req, res) => {
  const { name, description, price } = req.body;
  const { data, error } = await supabase
    .from('products')
    .insert([{ name, description, price }])
    .select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

// PUT - Perbarui produk berdasarkan ID
app.put('/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, price } = req.body;
  const { data, error } = await supabase
    .from('products')
    .update({ name, description, price })
    .eq('id', id)
    .select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.status(200).json(data);
});

// DELETE - Hapus produk berdasarkan ID
app.delete('/products/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.status(200).json({ message: 'Product deleted successfully' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});