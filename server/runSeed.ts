import 'dotenv/config';
import connectDB from './config/db';
import { seedSuperAdmin } from './seed';

void connectDB()
  .then(() => seedSuperAdmin())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
