import { useEffect, useState } from "react";
import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
} from "../api";
import Switch from "../components/Switch";

const emptyFormData = {
  name: "",
  username: "",
  password: "",
  is_admin: false,
};

function AdminPage() {
  const [users, setUsers] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState(emptyFormData);

  useEffect(() => {
    const fetchUsers = async () => {
      const data = await getUsers();
      setUsers(data);
    };

    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUserId(null);
    setFormData(emptyFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      username: user.username,
      password: "",
      is_admin: user.is_admin,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUserId(null);
    setFormData(emptyFormData);
  };

  const handleToggleAdmin = async (user) => {
    setUsers(users.map((other) =>
      other.id === user.id ? { ...other, is_admin: !other.is_admin } : other
    ));

    await updateUser(user.id, {
      name: user.name,
      username: user.username,
      password: "",
      is_admin: !user.is_admin,
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.username.trim()) return;

    try {
      setIsSaving(true);
      if (editingUserId === null) {
        const newUser = await createUser(formData);
        setUsers([newUser, ...users]);
      } else {
        const updatedUser = await updateUser(editingUserId, formData);
        setUsers(
          users.map((other) => (other.id === updatedUser.id ? updatedUser : other))
        );
      }

      closeModal();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (editingUserId === null) return;

    try {
      setIsDeleting(true);
      await deleteUser(editingUserId);
      setUsers(users.filter((other) => other.id !== editingUserId));
      closeModal();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 bg-[#F5F5F5] px-[6%] py-7">
      <div className="mb-6 flex items-center justify-between">
        <div className="text-3xl font-semibold">Пользователи</div>

        <button
          onClick={openCreateModal}
          className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90"
        >
          Добавить пользователя
        </button>
      </div>

      <div className="w-full overflow-x-auto rounded-2xl bg-white px-5 py-4 shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-300 text-left text-sm font-semibold text-gray-900">
              <th className="py-3 pr-4">ФИО</th>
              <th className="py-3 pr-4">Имя пользователя</th>
              <th className="py-3 pr-4">Админ</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="cursor-pointer border-b border-gray-200 text-sm text-gray-800 hover:bg-gray-50"
              >
                <td
                  className="py-3 pr-4"
                  onClick={() => openEditModal(user)}
                >
                  {user.name}
                </td>

                <td
                  className="py-3 pr-4"
                  onClick={() => openEditModal(user)}
                >
                  {user.username}
                </td>

                <td className="py-3 pr-4">
                  {user.is_owner ? (
                    <span className="bg-gray-800 text-white px-2 py-1 rounded-full">
                      Владелец
                    </span>
                  ) : (
                    <Switch
                      checked={user.is_admin}
                      handleChange={() => handleToggleAdmin(user)}
                    />
                  )}
                </td>
              </tr>
            ))}

            {users.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="py-8 text-center text-sm text-gray-400"
                >
                  Нет пользователей
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="text-base font-semibold text-gray-900">
                {editingUserId === null
                  ? "Добавить пользователя"
                  : "Редактировать пользователя"}
              </div>

              <button
                onClick={closeModal}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Закрыть
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4">
              <div>
                <div className="text-xs font-semibold text-gray-700">ФИО</div>
                <input
                  value={formData.name}
                  onChange={(event) =>
                    setFormData({ ...formData, name: event.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-700">
                  Имя пользователя
                </div>
                <input
                  value={formData.username}
                  onChange={(event) =>
                    setFormData({ ...formData, username: event.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-700">
                  Новый пароль (необязательно)
                </div>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(event) =>
                    setFormData({ ...formData, password: event.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              {editingUserId !== null ? (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting || isSaving}
                  className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
                >
                  {isDeleting ? "Удаление..." : "Удалить"}
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={handleSave}
                disabled={
                  isSaving ||
                  !formData.name.trim() ||
                  !formData.username.trim()
                }
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90 disabled:opacity-60"
              >
                {isSaving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
