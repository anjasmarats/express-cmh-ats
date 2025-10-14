// index.js
import express from 'express';
// import cors from 'cors';
import supabase from './supabaseClient.js';
import EJS from 'express-ejs-layouts'
import fileUpload from 'express-fileupload'
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'));
app.use(EJS)
app.use(fileUpload())
app.use(express.static(path.join(__dirname, 'assets')))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// GET - Ambil semua produk
app.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('articles')
    .select('*');
  
  if (error) {
    console.error("error halaman utama: ", error)
    return res.render("error.ejs",{
      layout: "layout",
      data: "server error"
    });
  }
  res.render("blog.ejs",{
    layout: "layout",
    data
  });
});

// halaman tambah artikel
app.get('/articles/new', (req, res)=>{
  try {
    return res.render("new-blog",{
      layout: "layout"
    })
  } catch (error) {
    console.error("error halaman utama", error)
    return res.render("error",{
      layout:"layout",
      data: "server error"
    });
  }
})

// POST - simpan artikel baru
app.post('/articles', async (req, res) => {
  const { title, description } = req.body;
  const { data, error } = await supabase
    .from('articles')
    .insert([{ title, description }])
    .select();

  if (error) {
    return res.render("error",{
      layout: "layout",
      data: "server error"
    });
  }
  return res.redirect("/articles");
});

// PUT - Perbarui produk berdasarkan ID
app.put('/articles/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;
  const { data, error } = await supabase
    .from('articles')
    .update({ title, description })
    .eq('id', id)
    .select();

  if (error) {
    return res.render("error",{
      layout: "layout",
      data: "server error"
    });
  }
  res.redirect("/");
});

// DELETE - Hapus produk berdasarkan ID
app.delete('/articles/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id);

  if (error) {
    return res.render("error",{
      layout: "layout",
      data: "server error"
    });
  }
  res.status(200).json({ message: 'Product deleted successfully' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});
