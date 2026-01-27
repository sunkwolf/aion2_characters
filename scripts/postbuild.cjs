// 构建后处理脚本
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n📦 开始构建后处理...\n');

// 1. 删除部署目录中的旧数据
const dirsToDelete = [
  '../部署/chunxia-legion/dist/data',
  '../部署/chunxia-legion/dist/images/gallery'
];

dirsToDelete.forEach(dir => {
  const fullPath = path.resolve(__dirname, '..', dir);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log('✅ 已删除', fullPath);
  }
});

// 2. 复制必要文件到部署目录
const filesToCopy = [
  { src: 'server/index.cjs', dest: '../部署/chunxia-legion/server/index.cjs' },
  { src: 'server/db/itemsDb.cjs', dest: '../部署/chunxia-legion/server/db/itemsDb.cjs' },
  { src: 'server/routes/items.cjs', dest: '../部署/chunxia-legion/server/routes/items.cjs' },
  { src: 'server/jobs/syncItems.cjs', dest: '../部署/chunxia-legion/server/jobs/syncItems.cjs' },
  { src: 'public/data/tools_config.json', dest: '../部署/chunxia-legion/public/data/tools_config.json' },
  { src: 'public/data/class_board_mapping.json', dest: '../部署/chunxia-legion/public/data/class_board_mapping.json' },
  { src: 'package.json', dest: '../部署/chunxia-legion/package.json' }
];

filesToCopy.forEach(file => {
  const srcPath = path.resolve(__dirname, '..', file.src);
  const destPath = path.resolve(__dirname, '..', file.dest);

  if (fs.existsSync(srcPath)) {
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(srcPath, destPath);
    console.log('✅ 已复制', file.src, '→', file.dest);
  }
});

// 3. 在部署目录安装生产依赖
console.log('\n📦 安装生产依赖...\n');
const deployDir = path.resolve(__dirname, '..', '../部署/chunxia-legion');

try {
  execSync('npm install --production', {
    cwd: deployDir,
    stdio: 'inherit'
  });
  console.log('\n✅ 依赖安装完成\n');
} catch (error) {
  console.error('❌ 依赖安装失败:', error.message);
  process.exit(1);
}

console.log('🎉 构建后处理完成！\n');
