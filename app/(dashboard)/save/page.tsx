'use client'
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';

const savingsProducts = [
  {
    title: 'Call Deposit',
    description: 'Start saving and have immediate access to your funds plus interest, without any penalty.',
    openLink: '#',
    learnLink: '#',
  },
  {
    title: 'Classic Savings',
    description: 'Save any amount as frequently as you can, while earning compounded interest.',
    openLink: '#',
    learnLink: '#',
  },
  {
    title: 'Fixed Deposit',
    description: 'Access your deposit amount plus interest, at the end of a fixed savings period.',
    openLink: '#',
    learnLink: '#',
  },
  {
    title: 'Goal Savings',
    description: 'Set your goals and start saving towards them immediately, while earning interest.',
    openLink: '#',
    learnLink: '#',
  },
];

export default function SavePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '', type: '' });
  const [submitted, setSubmitted] = useState(false);

  const openModal = (type: string) => {
    setSelectedType(type);
    setForm({ name: '', phone: '', email: '', type });
    setSubmitted(false);
    setModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // Simulate API call
    setTimeout(() => {
      setModalOpen(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 md:px-8">
      <div className="mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-main-600 mb-3">Grow your money</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            RukaPay offers a variety of products that help you save and invest your money. We offer various accounts that will assist you in increasing your wealth.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {savingsProducts.map((product) => (
            <div
              key={product.title}
              className="bg-white rounded-2xl shadow-md p-6 flex flex-col justify-between min-h-[260px] border border-gray-100 hover:shadow-lg transition-shadow"
            >
              <div>
                <h2 className="text-lg font-semibold text-main-600 mb-2">{product.title}</h2>
                <p className="text-gray-500 text-sm mb-6">{product.description}</p>
              </div>
              <div className="flex gap-2 mt-auto">
                <Dialog open={modalOpen && selectedType === product.title} onOpenChange={setModalOpen}>
                  <DialogTrigger asChild>
                    <button
                      className="flex-1 cursor-pointer inline-block text-center px-4 py-2 rounded-lg bg-main-600 text-white font-medium hover:bg-main-700 transition-colors text-sm shadow-sm"
                      onClick={() => openModal(product.title)}
                    >
                      Open an account
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Register for {selectedType}</DialogTitle>
                      <DialogDescription>
                        Fill in your details to open a <span className="font-semibold text-main-600">{selectedType}</span> account.
                      </DialogDescription>
                    </DialogHeader>
                    {submitted ? (
                      <div className="py-8 text-center">
                        <div className="text-2xl mb-2">🎉</div>
                        <div className="text-main-600 font-semibold mb-1">Registration successful!</div>
                        <div className="text-gray-500 text-sm">We will contact you soon.</div>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                        <div>
                          <label className="block text-sm font-medium mb-1">Full Name</label>
                          <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-main-500"
                            placeholder="Enter your name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Phone Number</label>
                          <input
                            type="tel"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-main-500"
                            placeholder="Enter your phone number"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Email Address</label>
                          <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-main-500"
                            placeholder="Enter your email"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Account Type</label>
                          <input
                            type="text"
                            name="type"
                            value={selectedType}
                            readOnly
                            className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-700"
                          />
                        </div>
                        <DialogFooter>
                          <button
                            type="submit"
                            className="w-full py-2 rounded-lg bg-main-600 text-white font-semibold hover:bg-main-700 transition-colors text-base mt-2"
                          >
                            Register
                          </button>
                        </DialogFooter>
                      </form>
                    )}
                  </DialogContent>
                </Dialog>
                <Link href={product.learnLink} legacyBehavior>
                  <a className="flex-1 inline-block text-center px-4 py-2 rounded-lg border border-main-600 text-main-600 font-medium hover:bg-main-50 transition-colors text-sm shadow-sm">
                    Learn more
                  </a>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 