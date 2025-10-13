#!/usr/bin/env node

/**
 * ⚡ Image Optimization Script
 * Converts PNG/JPG images to WebP format for better performance
 * Preserves original files with .original extension
 */

import { readdir, copyFile, unlink } from 'fs/promises';
import { join, extname, basename } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const IMAGE_DIRS = [
  'public/images/home',
  'public/images/tshirt-designs',
  'public/images/navbar',
];

const SUPPORTED_FORMATS = ['.png', '.jpg', '.jpeg'];
const WEBP_QUALITY = 85; // 85% quality (good balance)

async function convertToWebP(inputPath, outputPath) {
  try {
    // Using sharp via npx (no install needed if sharp is in package.json)
    const command = `npx sharp-cli --input "${inputPath}" --output "${outputPath}" --webp --quality ${WEBP_QUALITY}`;
    await execAsync(command);
    return true;
  } catch (error) {
    console.error(`❌ Failed to convert ${inputPath}:`, error.message);
    return false;
  }
}

async function processDirectory(dirPath) {
  try {
    const files = await readdir(dirPath);
    let converted = 0;
    let skipped = 0;

    console.log(`\n📁 Processing: ${dirPath}`);

    for (const file of files) {
      const ext = extname(file).toLowerCase();
      
      if (!SUPPORTED_FORMATS.includes(ext)) {
        continue;
      }

      const inputPath = join(dirPath, file);
      const baseName = basename(file, ext);
      const outputPath = join(dirPath, `${baseName}.webp`);
      const backupPath = join(dirPath, `${file}.original`);

      // Skip if WebP already exists
      try {
        await readdir(dirPath);
        if (files.includes(`${baseName}.webp`)) {
          console.log(`⏭️  Skipped: ${file} (WebP exists)`);
          skipped++;
          continue;
        }
      } catch (e) {
        // Continue if file doesn't exist
      }

      console.log(`🔄 Converting: ${file} → ${baseName}.webp`);

      // Backup original
      await copyFile(inputPath, backupPath);

      // Convert to WebP
      const success = await convertToWebP(inputPath, outputPath);

      if (success) {
        console.log(`✅ Converted: ${file} → ${baseName}.webp`);
        converted++;
      } else {
        // Restore from backup if conversion failed
        await copyFile(backupPath, inputPath);
        await unlink(backupPath);
        skipped++;
      }
    }

    console.log(`\n📊 ${dirPath}: ${converted} converted, ${skipped} skipped`);
    return { converted, skipped };
  } catch (error) {
    console.error(`❌ Error processing ${dirPath}:`, error.message);
    return { converted: 0, skipped: 0 };
  }
}

async function main() {
  console.log('🚀 Starting image optimization...\n');
  console.log('⚠️  Note: This requires sharp-cli to be available');
  console.log('   Install with: npm install -g sharp-cli\n');

  let totalConverted = 0;
  let totalSkipped = 0;

  for (const dir of IMAGE_DIRS) {
    const { converted, skipped } = await processDirectory(dir);
    totalConverted += converted;
    totalSkipped += skipped;
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✨ Optimization complete!`);
  console.log(`📊 Total: ${totalConverted} converted, ${totalSkipped} skipped`);
  console.log(`💾 Originals backed up with .original extension`);
  console.log('='.repeat(50));
}

main().catch(console.error);
