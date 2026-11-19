const bcrypt = require('bcryptjs');
const userModel = require('./models/userModel');

async function seedDefaultPetugas() {
  try {
    const email = 'petugas@sekolah.sch.id';
    const existing = await userModel.findByEmail(email);

    if (existing) {
      console.log(`[SEED] Akun ${email} sudah terdaftar di database.`);
      process.exit(0);
    }

    const password_hash = await bcrypt.hash('admin123', 10);
    const created = await userModel.createUser({
      nama_pengguna: 'Petugas Gudang Olahraga',
      email,
      password_hash,
      jabatan: 'Staf Sarpras Olahraga'
    });

    console.log('[SEED BERHASIL] Akun petugas siap digunakan:');
    console.log(`- Email    : ${created.email}`);
    console.log(`- Password : admin123`);
    process.exit(0);
  } catch (err) {
    console.error('[SEED GAGAL]', err.message);
    process.exit(1);
  }
}

seedDefaultPetugas();