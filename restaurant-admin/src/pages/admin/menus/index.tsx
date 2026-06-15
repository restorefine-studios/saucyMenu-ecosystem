/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { axiosInstance, renderMediaUrl } from '@/lib/utils'
import apiRoutes from '@/apiRoutes'
import { toast } from 'sonner'
import { useAtom } from 'jotai'
import { userAtom } from '@/atoms/user'
import { useNavigate } from 'react-router-dom'
import emptyDish from '@/assets/emptydish.jpg'
import Spinner from '@/components/Spinner'
import { useMenu, useMenuSections } from './hooks/use-menu'

// ─── Section items block ──────────────────────────────────────────────────────

function SectionItems({
  section, menuId,
}: {
  section: any
  menuId: string
}) {
  const [user] = useAtom(userAtom)
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['menuItems', section.id],
    queryFn: () =>
      axiosInstance.get(apiRoutes.menuItems, { params: { sectionId: section.id } })
        .then(r => r.data),
    enabled: !!section.id,
  })

  const items: any[] = (data as any)?.data?.result ?? (data as any)?.data ?? []

  if (isLoading) {
    return (
      <div className="py-4 flex justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 px-1 py-3">No items in this section yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-3">
          {items.map((item: any) => (
            <div
              key={item.id}
              onClick={() => navigate(`/admin/menus/${menuId}/items/${section.id}/edit/${item.id}`)}
              className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-[#F7941D]/40 transition-all cursor-pointer group"
            >
              <div className="relative aspect-[4/3] bg-gray-100">
                <img
                  src={item.images?.[0] ? renderMediaUrl(item.images[0]) : emptyDish}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </div>
              <div className="px-3 py-2">
                <p className="text-sm font-medium capitalize truncate text-gray-900">{item.name}</p>
                <p className="text-xs text-[#F7941D] font-semibold mt-0.5">
                  {user?.currency?.symbol}{item.price}
                </p>
              </div>
            </div>
          ))}
          {/* Add item tile */}
          <button
            onClick={() => navigate(`/admin/menus/${menuId}/items/${section.id}/add`)}
            className="aspect-[4/3] border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-[#F7941D] hover:text-[#F7941D] transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs font-medium">Add Item</span>
          </button>
        </div>
      )}
      {items.length === 0 && (
        <button
          onClick={() => navigate(`/admin/menus/${menuId}/items/${section.id}/add`)}
          className="mt-2 flex items-center gap-1.5 text-sm text-[#F7941D] hover:underline font-medium"
        >
          <Plus className="w-4 h-4" /> Add first item
        </button>
      )}
    </div>
  )
}

// ─── Sections for a menu ──────────────────────────────────────────────────────

function MenuSectionsView({ menuId }: { menuId: string }) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useMenuSections(menuId)
  const sections: any[] = (data as any)?.data ?? []

  // Add section
  const [addOpen, setAddOpen] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const [newSectionDesc, setNewSectionDesc] = useState('')

  const { mutate: addSection, isPending: addPending } = useMutation({
    mutationFn: () =>
      axiosInstance.post(apiRoutes.menuSections(menuId), {
        name: newSectionName,
        description: newSectionDesc,
      }),
    onSuccess: () => {
      toast.success('Section added')
      queryClient.invalidateQueries({ queryKey: ['menuSections', menuId] })
      setAddOpen(false)
      setNewSectionName('')
      setNewSectionDesc('')
    },
    onError: () => toast.error('Failed to add section'),
  })

  // Delete section
  const { mutate: deleteSection } = useMutation({
    mutationFn: (id: string) =>
      axiosInstance.delete(apiRoutes.deleteMenuSection(id)),
    onSuccess: () => {
      toast.success('Section deleted')
      queryClient.invalidateQueries({ queryKey: ['menuSections', menuId] })
    },
  })

  if (isLoading) return <div className="py-12 flex justify-center"><Spinner /></div>

  return (
    <div>
      {sections.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          <p className="font-medium">No sections yet</p>
          <p className="text-sm mt-1">Add your first section to start building the menu</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section: any) => (
            <div key={section.id}>
              {/* Section header */}
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-gray-900 capitalize text-base">{section.name}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => deleteSection(section.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="h-px bg-gray-100 mb-3" />
              <SectionItems section={section} menuId={menuId} />
            </div>
          ))}
        </div>
      )}

      {/* Add section button */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogTrigger asChild>
          <button className="mt-8 flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-[#F7941D] hover:text-[#F7941D] transition-colors w-full justify-center">
            <Plus className="w-4 h-4" /> Add Section
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Section</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="Section name (e.g. Starters)"
              value={newSectionName}
              onChange={e => setNewSectionName(e.target.value)}
            />
            <Textarea
              placeholder="Description (optional)"
              value={newSectionDesc}
              onChange={e => setNewSectionDesc(e.target.value)}
              rows={2}
            />
            <Button
              onClick={() => addSection()}
              disabled={!newSectionName.trim() || addPending}
              className="w-full bg-[#F7941D] hover:bg-[#e8850a] text-white"
            >
              {addPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Section'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Main menus page ──────────────────────────────────────────────────────────

const Menus = () => {
  const queryClient = useQueryClient()
  const { data, isLoading } = useMenu()
  const menus: any[] = (data as any)?.data ?? []

  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null)
  const activeMenuId = selectedMenuId ?? menus[0]?.id ?? null

  // Add menu dialog
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [menuName, setMenuName] = useState('')
  const [menuDesc, setMenuDesc] = useState('')

  const { mutate: addMenu, isPending: addMenuPending } = useMutation({
    mutationFn: () => axiosInstance.post(apiRoutes.menus, { name: menuName, description: menuDesc }),
    onSuccess: () => {
      toast.success('Menu created')
      queryClient.invalidateQueries({ queryKey: ['menus'] })
      setAddMenuOpen(false)
      setMenuName('')
      setMenuDesc('')
    },
    onError: () => toast.error('Failed to create menu'),
  })

  // Delete menu
  const { mutate: deleteMenu } = useMutation({
    mutationFn: (id: string) => axiosInstance.delete(apiRoutes.deleteMenu(id)),
    onSuccess: () => {
      toast.success('Menu deleted')
      queryClient.invalidateQueries({ queryKey: ['menus'] })
      setSelectedMenuId(null)
    },
  })

  if (isLoading) return <div className="flex justify-center items-center h-96"><Spinner /></div>

  return (
    <div className="px-10 md:px-16 lg:px-24 pt-10 pb-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Menus</h1>
      </div>

      {/* Menu pill tabs + add button */}
      <div className="flex items-center gap-2 flex-wrap mb-8">
        {menus.map((menu: any) => (
          <button
            key={menu.id}
            onClick={() => setSelectedMenuId(menu.id)}
            className={`px-5 py-2 rounded-full text-sm font-semibold border transition-all ${
              activeMenuId === menu.id
                ? 'bg-[#F7941D] text-white border-[#F7941D] shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#F7941D] hover:text-[#F7941D]'
            }`}
          >
            {menu.name}
          </button>
        ))}

        {/* Add menu */}
        <Dialog open={addMenuOpen} onOpenChange={setAddMenuOpen}>
          <DialogTrigger asChild>
            <button className="px-4 py-2 rounded-full text-sm font-semibold border-2 border-dashed border-gray-200 text-gray-500 hover:border-[#F7941D] hover:text-[#F7941D] transition-colors flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> New Menu
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Menu</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input
                placeholder="Menu name (e.g. Lunch Menu)"
                value={menuName}
                onChange={e => setMenuName(e.target.value)}
              />
              <Textarea
                placeholder="Description (optional)"
                value={menuDesc}
                onChange={e => setMenuDesc(e.target.value)}
                rows={2}
              />
              <Button
                onClick={() => addMenu()}
                disabled={!menuName.trim() || addMenuPending}
                className="w-full bg-[#F7941D] hover:bg-[#e8850a] text-white"
              >
                {addMenuPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Menu'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete active menu */}
        {activeMenuId && menus.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="ml-auto p-2 text-gray-400 hover:text-red-500 transition-colors" title="Delete this menu">
                <Trash2 className="w-4 h-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete menu?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the menu and all its sections. Items will not be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMenu(activeMenuId)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* No menus state */}
      {menus.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="font-medium text-lg">No menus yet</p>
          <p className="text-sm mt-1">Create your first menu to get started</p>
        </div>
      )}

      {/* Sections + items for selected menu */}
      {activeMenuId && <MenuSectionsView menuId={activeMenuId} />}
    </div>
  )
}

export default Menus
