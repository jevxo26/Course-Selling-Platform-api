const { JwtService } = require('@nestjs/jwt');
const dotenv = require('dotenv');
dotenv.config();

const jwtService = new JwtService({
  secret: process.env.JWT_SECRET,
  signOptions: { expiresIn: '7d' },
});

try {
  const token = jwtService.sign({ test: 'data' });
  console.log('JWT Sign Success:', token.substring(0, 10) + '...');
} catch (error) {
  console.error('JWT Sign Error:', error.message);
}
