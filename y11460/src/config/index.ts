export const config = {
  jwtSecret: process.env.JWT_SECRET || 'dental-clinic-secret-key-2024',
  jwtExpiresIn: '24h',
  port: parseInt(process.env.PORT || '3000', 10),
  uploadDir: './uploads',
  maxFileSize: 10 * 1024 * 1024
}
