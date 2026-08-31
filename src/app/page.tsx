import { QuincenaProvider } from '@/lib/QuincenaContext'
import QuincenaNavigator from '@/components/QuincenaNavigator'
import IngresoHogar from '@/components/IngresoHogar'
import CategoriasHogar from '@/components/CategoriasHogar'
import TarjetasCredito from '@/components/TarjetasCredito'
import MetasAhorro from '@/components/MetasAhorro'
import RegistrarGasto from '@/components/RegistrarGasto'
import MovimientosRecientes from '@/components/MovimientosRecientes'

export default function Home() {
  return (
    <QuincenaProvider>
      <div className="min-h-screen flex flex-col items-center px-4 py-6 sm:px-8 sm:py-10">
        <div className="w-full max-w-xl">
          <QuincenaNavigator />
          <IngresoHogar />
          <CategoriasHogar />
          <TarjetasCredito />
          <MetasAhorro />
          <RegistrarGasto />
          <MovimientosRecientes />
        </div>
      </div>
    </QuincenaProvider>
  )
}