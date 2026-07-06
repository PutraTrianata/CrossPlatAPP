import { supabase } from './supabase';

export const apiService = {
  // 1. CARI ONLINE (Google Books API)
  async fetchExternalBook(isbn) {
    try {
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
      const data = await response.json();
      if (data.totalItems > 0) {
        const info = data.items[0].volumeInfo;
        return {
          barcode: isbn,
          title: info.title,
          author: info.authors ? info.authors.join(', ') : 'Unknown Author'
        };
      }
      return null;
    } catch (error) {
      console.error('[API ERROR EXTERNAL]', error.message);
      return null;
    }
  },

  getTable(endpoint) {
    if (endpoint.includes('/api/books')) return 'books';
    if (endpoint.includes('/api/borrow')) return 'peminjaman';
    if (endpoint.includes('/api/login') || endpoint.includes('/api/register') || endpoint.includes('/api/update-profile')) return 'users';
    return null;
  },

  async get(endpoint) {
    try {
      if (endpoint.startsWith('/api/books/') && endpoint.split('/').length > 3) {
        const barcode = endpoint.split('/')[3].split('?')[0];
        const { data, error } = await supabase.from('books').select('*').eq('barcode', barcode).single();
        if (error && error.code !== 'PGRST116') throw error;
        return { success: true, book: data };
      }

      const table = this.getTable(endpoint);
      if (!table) throw new Error('Endpoint tidak dikenal');
      
      if (table === 'peminjaman') {
        const { data, error } = await supabase
          .from('peminjaman')
          .select('*, books(title, author)')
          .order('borrow_date', { ascending: false });
        if (error) throw error;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return data.map(item => {
          const returnDate = new Date(item.return_date);
          returnDate.setHours(0, 0, 0, 0);
          const diffTime = today.getTime() - returnDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const denda = diffDays > 0 ? diffDays * 1000 : 0;

          return {
            ...item, 
            title: item.books?.title, 
            author: item.books?.author,
            denda: denda,
            isTerlambat: diffDays > 0
          };
        });
      }

      const { data, error } = await supabase.from(table).select('*');
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[API ERROR GET]', error.message);
      throw error;
    }
  },

  async post(endpoint, body) {
    try {
      if (endpoint === '/api/login') {
        const { data, error } = await supabase.from('users').select('*').eq('email', body.email).eq('password', body.password).single();
        if (error) throw new Error('Email atau Password salah');
        return { success: true, user: data };
      }
      
      if (endpoint === '/api/register') {
        const { data, error } = await supabase.from('users').insert([body]).select().single();
        if (error) {
          // Handle Duplicate Key Error (Unique Constraint)
          if (error.code === '23505') {
            throw new Error('Alamat email ini sudah terdaftar dalam sistem.');
          }
          throw error;
        }
        return { success: true, user: data };
      }

      if (endpoint === '/api/update-profile') {
        const { data, error } = await supabase.from('users').update({ name: body.name, email: body.email }).eq('id', body.id).select().single();
        if (error) {
          if (error.code === '23505') throw new Error('Email sudah digunakan oleh pengguna lain.');
          throw error;
        }
        return { success: true, user: data };
      }

      const table = this.getTable(endpoint);
      if (table === 'peminjaman') {
        const borrowData = {
          ...body,
          borrow_date: body.borrow_date || new Date().toISOString().split('T')[0]
        };
        const { error: insErr } = await supabase.from('peminjaman').insert([borrowData]);
        if (insErr) throw insErr;

        const { data: b } = await supabase.from('books').select('stok').eq('barcode', body.barcode).single();
        await supabase.from('books').update({ stok: (b?.stok || 1) - 1 }).eq('barcode', body.barcode);
        return { success: true };
      }

      const { data, error } = await supabase.from(table).insert([body]).select();
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('[API ERROR POST]', error.message);
      throw error;
    }
  },

  async put(endpoint, body) {
    try {
      const table = this.getTable(endpoint);
      const barcode = endpoint.split('/').pop();
      const { data, error } = await supabase.from(table).update(body).eq('barcode', barcode).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[API ERROR PUT]', error.message);
      throw error;
    }
  },

  async delete(endpoint) {
    try {
      const table = this.getTable(endpoint);
      const idOrBarcode = endpoint.split('/').pop();

      if (table === 'peminjaman') {
        const { data: p } = await supabase.from('peminjaman').select('barcode').eq('id', idOrBarcode).single();
        if (p) {
          const { data: b } = await supabase.from('books').select('stok').eq('barcode', p.barcode).single();
          await supabase.from('books').update({ stok: (b?.stok || 0) + 1 }).eq('barcode', p.barcode);
        }
        await supabase.from('peminjaman').delete().eq('id', idOrBarcode);
        return { success: true };
      }

      const { error } = await supabase.from(table).delete().eq('barcode', idOrBarcode);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('[API ERROR DELETE]', error.message);
      throw error;
    }
  }
};
