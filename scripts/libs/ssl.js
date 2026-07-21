#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const spawnSync = require('child_process').spawnSync;
const console = require('./console');


const SSL_DIR = path.join(__dirname, '..', '..', 'ssl');
const CA_NAME = 'Firestitch Development Root CA';

const files = {
  caCnf: path.join(SSL_DIR, 'ca.cnf'),
  caCrt: path.join(SSL_DIR, 'ca.crt'),
  caKey: path.join(SSL_DIR, 'ca.key'),
  leafCnf: path.join(SSL_DIR, 'localhost.cnf'),
  leafCrt: path.join(SSL_DIR, 'localhost.crt'),
  leafKey: path.join(SSL_DIR, 'localhost.key'),
};

function run(cmd, args, options) {
  return spawnSync(cmd, args, { encoding: 'utf8', ...(options || {}) });
}

/** SHA-1 thumbprint of a PEM certificate -- the handle Windows certutil uses. */
function thumbprint(file) {
  const der = Buffer.from(
    fs.readFileSync(file, 'utf8')
      .replace(/-----BEGIN CERTIFICATE-----/, '')
      .replace(/-----END CERTIFICATE-----/, '')
      .replace(/\s+/g, ''),
    'base64',
  );

  return crypto.createHash('sha1').update(der).digest('hex').toUpperCase();
}

function notAfter(file) {
  const out = run('openssl', ['x509', '-in', file, '-noout', '-enddate']);
  const match = /notAfter=(.*)/.exec(out.stdout || '');

  return match ? match[1].trim() : null;
}

/** True when the root CA is already in this machine's trust store. */
function trusted() {
  if (process.platform === 'win32') {
    return run('certutil', ['-user', '-verifystore', 'Root', thumbprint(files.caCrt)]).status === 0;
  }

  if (process.platform === 'darwin') {
    return run('security', ['find-certificate', '-c', CA_NAME]).status === 0;
  }

  return null; // Linux: too many stores to probe reliably
}

function trust() {
  if (!fs.existsSync(files.caCrt)) {
    console.error(`Missing ${files.caCrt}. Run: ssl generate`);
    return 1;
  }

  if (trusted()) {
    console.success(`${CA_NAME} is already trusted. Nothing to do.`);
    return 0;
  }

  console.log(`Installing ${CA_NAME} (expires ${notAfter(files.caCrt) || 'unknown'})`);

  if (process.platform === 'win32') {
    // -user writes to the current user's store, so no administrator elevation is
    // needed. Windows may still raise a security confirmation dialog -- accept it.
    const result = run('certutil', ['-user', '-addstore', 'Root', files.caCrt], { stdio: 'inherit' });

    if (result.status !== 0) {
      console.error('certutil failed. Accept the Windows security prompt, or import ssl/ca.crt manually via certmgr.msc > Trusted Root Certification Authorities.');
      return result.status || 1;
    }
  } else if (process.platform === 'darwin') {
    // The login keychain avoids sudo; macOS prompts for the account password.
    const keychain = path.join(process.env.HOME, 'Library', 'Keychains', 'login.keychain-db');
    const result = run('security', ['add-trusted-cert', '-r', 'trustRoot', '-k', keychain, files.caCrt], { stdio: 'inherit' });

    if (result.status !== 0) {
      console.error('security add-trusted-cert failed. Open ssl/ca.crt in Keychain Access and set it to "Always Trust" manually.');
      return result.status || 1;
    }
  } else {
    return trustLinux();
  }

  console.success(`${CA_NAME} installed. Restart your browser, then serve --secure shows a padlock with no warning.`);
  console.log('Firefox keeps its own trust store: set security.enterprise_roots.enabled = true in about:config, or import ssl/ca.crt under Settings > Certificates.');

  return 0;
}

/** Linux has no single store: the system bundle covers curl/node, NSS covers Chrome. */
function trustLinux() {
  let installed = false;

  const anchors = [
    { dir: '/usr/local/share/ca-certificates', file: 'firestitch-dev-root-ca.crt', update: 'update-ca-certificates' },
    { dir: '/etc/pki/ca-trust/source/anchors', file: 'firestitch-dev-root-ca.crt', update: 'update-ca-trust' },
  ];

  for (const anchor of anchors) {
    if (!fs.existsSync(anchor.dir)) {
      continue;
    }

    const copy = run('sudo', ['cp', files.caCrt, path.join(anchor.dir, anchor.file)], { stdio: 'inherit' });

    if (copy.status === 0 && run('sudo', [anchor.update], { stdio: 'inherit' }).status === 0) {
      installed = true;
      break;
    }
  }

  // Chrome and Chromium read this NSS database rather than the system bundle.
  const nssdb = path.join(process.env.HOME, '.pki', 'nssdb');

  if (fs.existsSync(nssdb)) {
    const result = run('certutil', ['-d', `sql:${nssdb}`, '-A', '-t', 'C,,', '-n', CA_NAME, '-i', files.caCrt], { stdio: 'inherit' });

    if (result.status === 0) {
      installed = true;
    } else {
      console.error('NSS import failed -- install libnss3-tools (apt) / nss-tools (dnf) and rerun so Chrome picks the CA up.');
    }
  }

  if (!installed) {
    console.error(`Could not install automatically. Add ${files.caCrt} to your distribution's trust store by hand.`);
    return 1;
  }

  console.success(`${CA_NAME} installed. Restart your browser.`);

  return 0;
}

function untrust() {
  if (process.platform === 'win32') {
    run('certutil', ['-user', '-delstore', 'Root', thumbprint(files.caCrt)], { stdio: 'inherit' });
  } else if (process.platform === 'darwin') {
    run('security', ['delete-certificate', '-c', CA_NAME], { stdio: 'inherit' });
  } else {
    console.error('Remove the CA manually from your distribution trust store and ~/.pki/nssdb.');
    return 1;
  }

  console.success(`${CA_NAME} removed.`);

  return 0;
}

function info() {
  if (!fs.existsSync(files.caCrt)) {
    console.error(`Missing ${files.caCrt}. Run: ssl generate`);
    return 1;
  }

  const isTrusted = trusted();

  console.log(`CA          ${CA_NAME}`);
  console.log(`  expires   ${notAfter(files.caCrt) || 'unknown (openssl not on PATH)'}`);
  console.log(`  sha1      ${thumbprint(files.caCrt)}`);
  console.log(`  trusted   ${isTrusted === null ? 'unknown on this platform' : isTrusted}`);
  console.log(`Certificate ${files.leafCrt}`);
  console.log(`  expires   ${notAfter(files.leafCrt) || 'unknown (openssl not on PATH)'}`);

  const hosts = run('openssl', ['x509', '-in', files.leafCrt, '-noout', '-ext', 'subjectAltName']);

  if (hosts.status === 0) {
    console.log(`  hosts     ${(hosts.stdout || '').split('\n').slice(1).join(' ').trim()}`);
  }

  if (isTrusted === false) {
    console.error('The CA is not trusted yet -- run: ssl trust');
  }

  return 0;
}

function openssl(steps) {
  if (run('openssl', ['version']).status !== 0) {
    console.error('openssl is required to generate certificates but was not found on PATH.');
    return 1;
  }

  for (const args of steps) {
    const result = run('openssl', args, { stdio: 'inherit' });

    if (result.status !== 0) {
      console.error(`openssl ${args[0]} failed.`);
      return result.status || 1;
    }
  }

  for (const scratch of ['localhost.csr', 'ca.srl']) {
    fs.rmSync(path.join(SSL_DIR, scratch), { force: true });
  }

  return 0;
}

const leafSteps = [
  ['genrsa', '-out', files.leafKey, '2048'],
  ['req', '-new', '-key', files.leafKey, '-out', path.join(SSL_DIR, 'localhost.csr'), '-config', files.leafCnf],
  ['x509', '-req', '-in', path.join(SSL_DIR, 'localhost.csr'), '-CA', files.caCrt, '-CAkey', files.caKey,
    '-CAcreateserial', '-out', files.leafCrt, '-days', '3650', '-sha256', '-extfile', files.leafCnf, '-extensions', 'leaf_ext'],
];

/** Reissues only the leaf, keeping the CA. Changing hostnames does not need a re-trust. */
function reissue() {
  if (!fs.existsSync(files.caKey)) {
    console.error(`Missing ${files.caKey}, so the leaf cannot be signed. Run: ssl generate`);
    return 1;
  }

  const status = openssl(leafSteps);

  if (status === 0) {
    console.success('Reissued ssl/localhost.crt. The CA is unchanged, so no machine needs to re-trust anything.');
    console.log('Restart the dev server to pick it up.');
  }

  return status;
}

/** Reissues the root CA and the leaf. Rare: the CA lasts 20 years, the leaf 10. */
function generate() {
  const status = openssl([
    ['genrsa', '-out', files.caKey, '4096'],
    ['req', '-x509', '-new', '-nodes', '-key', files.caKey, '-sha256', '-days', '7300', '-out', files.caCrt, '-config', files.caCnf],
    ...leafSteps,
  ]);

  if (status === 0) {
    console.success('Regenerated ssl/ca.crt and ssl/localhost.crt.');
    console.log('The CA changed, so every machine must rerun: ssl trust');
  }

  return status;
}

module.exports = {
  CA_NAME: CA_NAME,
  files: files,
  trusted: trusted,
  trust: trust,
  untrust: untrust,
  info: info,
  reissue: reissue,
  generate: generate,
};
