import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CheckResult {
  status: 'ok' | 'error' | 'warning';
  version?: string;
  message: string;
}

export interface DiagnosticResult {
  docker: CheckResult;
  kubectl: CheckResult;
  kind: CheckResult;
  helm: CheckResult;
  cluster: CheckResult;
  iptables: CheckResult;
}

async function runCommand(command: string): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 10000 });
    return { stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error: any) {
    return { stdout: '', stderr: error.message || 'Command failed' };
  }
}

async function checkDocker(): Promise<CheckResult> {
  try {
    const { stdout, stderr } = await runCommand('docker --version');
    if (stderr && !stdout) {
      return { status: 'error', message: 'Docker non disponible' };
    }
    const version = stdout.match(/Docker version ([0-9.]+)/)?.[1] || 'unknown';
    return { status: 'ok', version, message: `Version ${version}` };
  } catch {
    return { status: 'error', message: 'Docker non installé' };
  }
}

async function checkKubectl(): Promise<CheckResult> {
  try {
    const { stdout, stderr } = await runCommand('kubectl version --client -o json');
    if (stderr && !stdout) {
      return { status: 'error', message: 'kubectl non disponible' };
    }
    const data = JSON.parse(stdout);
    const version = data.clientVersion?.gitVersion || 'unknown';
    return { status: 'ok', version, message: `Version ${version}` };
  } catch {
    return { status: 'error', message: 'kubectl non installé' };
  }
}

async function checkKind(): Promise<CheckResult> {
  try {
    const { stdout, stderr } = await runCommand('kind version');
    if (stderr && !stdout) {
      return { status: 'error', message: 'kind non disponible' };
    }
    const version = stdout.match(/kind v?([0-9.]+)/)?.[1] || 'unknown';
    return { status: 'ok', version, message: `Version ${version}` };
  } catch {
    return { status: 'error', message: 'kind non installé' };
  }
}

async function checkHelm(): Promise<CheckResult> {
  try {
    const { stdout, stderr } = await runCommand('helm version --short');
    if (stderr && !stdout) {
      return { status: 'error', message: 'helm non disponible' };
    }
    const version = stdout.replace(/^v/, '').split('+')[0];
    return { status: 'ok', version, message: `Version ${version}` };
  } catch {
    return { status: 'error', message: 'helm non installé' };
  }
}

async function checkCluster(): Promise<CheckResult> {
  try {
    const { stdout, stderr } = await runCommand('kubectl cluster-info');
    if (stderr && !stdout) {
      return { status: 'error', message: 'Cluster non accessible' };
    }
    if (stdout.includes('Kubernetes control plane') || stdout.includes('Kubernetes master')) {
      return { status: 'ok', message: 'Cluster actif' };
    }
    return { status: 'warning', message: 'Cluster status inconnu' };
  } catch {
    return { status: 'error', message: 'Aucun cluster configuré' };
  }
}

async function checkIptables(): Promise<CheckResult> {
  try {
    // Vérifier si les règles Kind sont présentes
    const { stdout } = await runCommand('sudo iptables -L INPUT -n 2>/dev/null || iptables -L INPUT -n 2>/dev/null');
    if (stdout.includes('172.19') || stdout.includes('172.18')) {
      return { status: 'ok', message: 'Règles Kind configurées' };
    }
    return { status: 'warning', message: 'Règles Kind non détectées' };
  } catch {
    return { status: 'warning', message: 'Vérification impossible (sudo requis)' };
  }
}

export async function runDiagnostic(): Promise<DiagnosticResult> {
  const [docker, kubectl, kind, helm, cluster, iptables] = await Promise.all([
    checkDocker(),
    checkKubectl(),
    checkKind(),
    checkHelm(),
    checkCluster(),
    checkIptables()
  ]);

  return { docker, kubectl, kind, helm, cluster, iptables };
}

export interface NetworkInfo {
  kindSubnet: string | null;
  hostIP: string | null;
  gateway: string | null;
}

export async function getNetworkInfo(): Promise<NetworkInfo> {
  let kindSubnet: string | null = null;
  let hostIP: string | null = null;
  let gateway: string | null = null;

  try {
    // Récupérer le subnet Kind
    const { stdout: networkInfo } = await runCommand(
      'docker network inspect kind 2>/dev/null | grep -oP \'"Subnet": "\\K[0-9./]+\' | head -1'
    );
    if (networkInfo) {
      kindSubnet = networkInfo;
    }
  } catch {
    // Ignorer
  }

  try {
    // Récupérer l'IP de l'hôte
    const { stdout: routeInfo } = await runCommand('ip route get 1 | awk \'{print $7; exit}\'');
    if (routeInfo) {
      hostIP = routeInfo;
    }
  } catch {
    // Ignorer
  }

  try {
    // Récupérer le gateway Docker
    const { stdout: gatewayInfo } = await runCommand(
      'docker network inspect kind 2>/dev/null | grep -oP \'"Gateway": "\\K[0-9.]+\' | head -1'
    );
    if (gatewayInfo) {
      gateway = gatewayInfo;
    }
  } catch {
    // Ignorer
  }

  return { kindSubnet, hostIP, gateway };
}
