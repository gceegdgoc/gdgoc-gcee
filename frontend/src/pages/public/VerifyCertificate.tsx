import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShieldCheck, ShieldX, Download, QrCode } from 'lucide-react';
import { PageLoader } from '../../components/ui/Spinner';
import { CertificatePreview } from '../../components/admin/CertificatePreview';
import { api, getErrorMessage } from '../../lib/api';
import { downloadPdf, cn } from '../../lib/utils';
import type { Certificate } from '../../types';

export default function VerifyCertificate() {
  const { certificateId } = useParams();
  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setNotFound(false);
    setCert(null);
    api
      .get(`/certificates/verify/${certificateId}`)
      .then((res) => {
        if (mounted) setCert(res.data.certificate);
      })
      .catch((err) => {
        if (mounted) {
          setNotFound(true);
          toast.error(getErrorMessage(err));
        }
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [certificateId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 pt-28">
        <PageLoader label="Verifying certificate…" />
      </div>
    );
  }

  if (notFound || !cert) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 pt-28">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-g-red/10 text-g-red">
            <ShieldX className="h-8 w-8" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold text-navy-900">Certificate Not Found</h1>
          <p className="mt-2 text-sm text-ink-muted">
            We could not find a certificate with ID <span className="font-mono text-navy-900">{certificateId}</span>.
            Check the ID and try again.
          </p>
          <Link to="/" className="btn-primary mt-6">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const revoked = cert.status === 'REVOKED';
  const eventName = cert.eventName || cert.campaignName || 'GDGoC GCEE';
  const eventDate = cert.eventDateLabel || '';

  const handleDownload = async () => {
    setDownloading(true);
    downloadPdf(cert.certificateId);
    setTimeout(() => {
      setDownloading(false);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-20 sm:pt-28">
      <div className="container-x max-w-3xl px-4 sm:px-6">
        {/* Certificate Preview Card */}
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-slate-100 p-3 sm:p-5 shadow-lift">
          <CertificatePreview
            data={{
              participantName: cert.studentName,
              eventName: eventName,
              eventDateLabel: eventDate || cert.issueDateLabel || '',
              certificateId: cert.certificateId,
              organization: cert.organization,
              institution: cert.institution,
              qrCode: cert.qrCode,
            }}
          />
        </div>

        {/* Verification Status Banner */}
        <div
          className={cn(
            'mt-6 flex items-center gap-4 rounded-2xl border p-4 sm:p-5',
            revoked ? 'border-g-red/30 bg-g-red/10' : 'border-g-green/30 bg-g-green/10'
          )}
        >
          {revoked ? (
            <ShieldX className="h-8 w-8 shrink-0 text-g-red sm:h-10 sm:w-10" />
          ) : (
            <ShieldCheck className="h-8 w-8 shrink-0 text-g-green sm:h-10 sm:w-10" />
          )}
          <div className="flex-1">
            <h1 className={cn('font-display text-lg font-bold sm:text-2xl', revoked ? 'text-g-red' : 'text-green-700')}>
              {revoked ? 'Certificate Revoked' : 'Certificate Verified'}
            </h1>
            <p className="mt-0.5 text-xs text-ink-soft sm:text-sm">
              {revoked ? 'This certificate is no longer valid.' : 'Certificate of Participation'}
            </p>
          </div>
          {revoked && (
            <span className="hidden rounded-full bg-g-red px-3 py-1 text-xs font-bold tracking-wider text-white sm:block">
              {cert.status}
            </span>
          )}
        </div>

        {/* Certificate Details */}
        <div className="mt-4 rounded-2xl border border-navy-100 bg-white p-5 shadow-sm sm:p-6">
          <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-faint">Student Name</dt>
              <dd className="mt-1 font-semibold text-navy-900">{cert.studentName}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-faint">Event</dt>
              <dd className="mt-1 font-semibold text-navy-900">{eventName}</dd>
            </div>
            {eventDate && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink-faint">Event Date</dt>
                <dd className="mt-1 font-semibold text-navy-900">{eventDate}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-faint">Organized By</dt>
              <dd className="mt-1 font-semibold text-navy-900">GDGoC GCEE</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-faint">Certificate ID</dt>
              <dd className="mt-1 font-mono font-semibold text-navy-900">{cert.certificateId}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-faint">Status</dt>
              <dd className="mt-1 flex items-center gap-1.5 font-semibold text-navy-900">
                {revoked ? (
                  <><ShieldX className="h-4 w-4 text-g-red" /> Revoked</>
                ) : (
                  <><ShieldCheck className="h-4 w-4 text-g-green" /> Verified Certificate</>
                )}
              </dd>
            </div>
          </dl>

          {revoked && cert.revokedAt && (
            <p className="mt-6 rounded-lg bg-g-red/10 p-3 text-center text-sm font-medium text-g-red">
              Revoked on {new Date(cert.revokedAt).toLocaleDateString('en-IN')}. The record is preserved for audit.
            </p>
          )}

          {!revoked && (
            <div className="mt-6 border-t border-navy-50 pt-6">
              <button onClick={handleDownload} disabled={downloading} className="btn-green w-full">
                {downloading ? (
                  'downloading...'
                ) : downloaded ? (
                  'Certificate Downloaded'
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Download className="h-4 w-4" /> Download Certificate PDF
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
