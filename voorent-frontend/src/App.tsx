import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Browse from './pages/Browse'
import ProductDetails from './pages/ProductDetails'
import ConfirmRental from './pages/ConfirmRental'
import Login from './pages/Login'
import MyRentals from './pages/MyRentals'
import OwnerDashboard from './pages/OwnerDashboard'
import ListAnItem from './pages/ListAnItem'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import WriteReview from './pages/WriteReview'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import InvoicePage from './pages/InvoicePage'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/item/:id" element={<ProductDetails />} />
        <Route path="/checkout/:listingId" element={<ConfirmRental />} />
        <Route path="/login" element={<Login />} />
        <Route path="/my-rentals" element={<MyRentals />} />
        <Route path="/dashboard/owner" element={<OwnerDashboard />} />
        <Route path="/list" element={<ListAnItem />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/item/:id/review" element={<WriteReview />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/invoice/:id" element={<InvoicePage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
