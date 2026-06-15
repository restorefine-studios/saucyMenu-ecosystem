import { useState } from 'react'
import { PageTabs } from '@/components/PageTabs'
import { useAdminProfile } from '@/hooks/useFetchData'
import Spinner from '@/components/Spinner'
import Brand from './components/brand'
import Email from './components/email'
import Password from './components/password'
import QRCodeSettings from './components/qr-code'
import { Security } from './components/security'

const TABS = [
  { key: 'brand',    label: 'Brand' },
  { key: 'password', label: 'Password' },
  { key: 'email',    label: 'Email' },
  { key: 'qr',       label: 'QR Code' },
  { key: 'security', label: 'Security' },
]

function Settings() {
  const [activeTab, setActiveTab] = useState('brand')
  const { data, isLoading } = useAdminProfile()

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner />
      </div>
    )
  }

  const profile = (data as any)?.data

  return (
    <div className="px-10 md:px-16 lg:px-24 pt-10 pb-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <PageTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
        {activeTab === 'brand' && (
          <Brand
            brand={{
              address:     profile?.restaurant?.address,
              description: profile?.restaurant?.description,
              image:       profile?.restaurant?.image,
              currencyId:  profile?.restaurant?.currencyId,
            }}
          />
        )}
        {activeTab === 'password' && <Password />}
        {activeTab === 'email'    && <Email defaultEmail={profile?.email} />}
        {activeTab === 'qr'       && (
          <QRCodeSettings
            restaurantId={profile?.restaurant?.id ?? ''}
            restaurantName={profile?.restaurant?.name ?? ''}
            slug={profile?.restaurant?.slug ?? undefined}
          />
        )}
        {activeTab === 'security' && <Security />}
      </div>
    </div>
  )
}

export default Settings
