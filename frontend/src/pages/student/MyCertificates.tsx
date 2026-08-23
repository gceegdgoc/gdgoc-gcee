import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Award, Eye, BadgeCheck, Download, FileText, ShieldX } from 'lucide-react';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { CertificatePreview } from '../../components/admin/CertificatePreview';
import { api, getErrorMessage, downloadPdf } from '../../lib/api';
import { cn } from '../../lib/utils';
import type { Certificate } from '../../types';

export default function MyCertificates() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Certificate | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .get('/certificates/my')
      .then((res) => mounted && setCerts(res.data.certificates))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <PageLoader label="Loading certificates…" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">My Certificates</h1>
        <p className="mt-1 text-sm text-ink-muted">Your participation certificates for GDGoC GCEE campaigns.</p>
      </div>

      {certs.length === 0 ? (
        <EmptyState
          icon={<Award className="h-7 w-7" />}
          title="No certificates yet"
          description="Attend certificate-eligible events and meet the campaign criteria to earn one."
          action={<Link to="/events" className="btn-primary">Explore eligible events</Link>}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {certs.map((cert) => {
            const revoked = cert.status === 'REVOKED';
            const eventName = cert.eventName || cert.campaignName || 'GDGoC GCEE';
            const dateLabel = cert.eventDateLabel || '';
            return (
              <div key={cert.certificateId} className={cn('card overflow-hidden', revoked && 'opacity-90')}>
                <div className={cn('p-5 text-white', revoked ? 'bg-gradient-to-br from-g-red to-red-700' : 'bg-gradient-to-br from-navy-900 to-navy-700')}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-display text-lg font-bold">Certificate of Participation</p>
                      <p className="text-xs text-white/70">{eventName}</p>
                    </div>
                    {revoked ? <ShieldX className="h-6 w-6 text-white/80" /> : <Award className="h-6 w-6 text-g-yellow" />}
                  </div>
                  {dateLabel && (
                    <div className="mt-4 font-mono text-[11px] text-white/70">
                      <span>{dateLabel}</span>
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <dl className="space-y-2 text-sm">
                    {cert.eventName && (
                      <div className="flex justify-between">
                        <dt className="text-ink-muted">Event</dt>
                        <dd className="font-semibold text-navy-900">{cert.eventName}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-ink-muted">Certificate ID</dt>
                      <dd className="font-mono text-xs font-semibold text-navy-900">{cert.certificateId}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex flex-col gap-2">
                    <button onClick={() => setPreview(cert)} className="btn-dark w-full">
                      <Eye className="h-4 w-4" /> View
                    </button>
                    <div className="flex gap-2">
                      <Link to={`/certificate/${cert.certificateId}`} className="btn-outline flex-1 !py-2">
                        <BadgeCheck className="h-4 w-4" /> Verify
                      </Link>
                      {!revoked && (
                        <button onClick={() => downloadPdf(cert.certificateId)} className="btn-green flex-1 !py-2">
                          <Download className="h-4 w-4" /> PDF
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!preview} onClose={() => setPreview(null)} title="Certificate Preview" wide>
        {preview && (
          <div>
            <div className="overflow-hidden rounded-2xl border border-navy-100 bg-slate-100 p-3 sm:p-5 shadow-inner">
              <CertificatePreview
                data={{
                  participantName: preview.studentName,
                  eventName: preview.eventName || preview.campaignName || 'GDGoC GCEE Event',
                  eventDateLabel: preview.eventDateLabel || preview.issueDateLabel || '',
                  certificateId: preview.certificateId,
                  organization: preview.organization,
                  institution: preview.institution,
                  qrCode: preview.qrCode,
                }}
              />
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link to={`/certificate/${preview.certificateId}`} className="btn-outline flex-1">
                <BadgeCheck className="h-4 w-4" /> Verify
              </Link>
              {preview.status !== 'REVOKED' && (
                <button onClick={() => downloadPdf(preview.certificateId)} className="btn-green flex-1">
                  <Download className="h-4 w-4" /> Download PDF
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
