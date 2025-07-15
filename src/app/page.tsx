
"use client";

import { useState, useRef, useEffect, type ChangeEvent, type DragEvent } from "react";
import NextImage from "next/image";
import {
  UploadCloud,
  FileImage,
  Lock,
  Unlock,
  Download,
  Loader2,
  Sparkles,
  X,
  Github,
  Link as LinkIcon,
  Mic,
  Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import JSZip from "jszip";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { useLanguage } from "@/hooks/use-language";
import LanguageSwitcher from "@/components/language-switcher";

type Format = "jpeg" | "png" | "webp";

interface ImageInfo {
  file: File;
  preview: string;
  width: number;
  height: number;
  targetWidth: string;
  targetHeight: string;
}

export default function Home() {
  const { translations } = useLanguage();
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [globalWidth, setGlobalWidth] = useState<string>("");
  const [globalHeight, setGlobalHeight] = useState<string>("");
  const [format, setFormat] = useState<Format>("jpeg");
  const [quality, setQuality] = useState<number>(80);
  const [keepAspectRatio, setKeepAspectRatio] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [lastEdited, setLastEdited] = useState<'width' | 'height' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (translations.metadata.title) {
      document.title = translations.metadata.title;
    }
  }, [translations]);
  
  const handleImageUpload = (files: FileList) => {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith("image/"));
    
    if(imageFiles.length === 0) {
        toast({
            title: translations.toasts.noValidFiles.title,
            description: translations.toasts.noValidFiles.description,
            variant: "destructive",
        });
        return;
    }

    const newImages: Omit<ImageInfo, 'targetWidth' | 'targetHeight'>[] = [];

    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultStr = reader.result as string;
        const img = new Image();
        img.onload = () => {
          newImages.push({
            file,
            preview: resultStr,
            width: img.width,
            height: img.height,
          });

          if (newImages.length === imageFiles.length) {
            setImages(prevImages => {
              const updatedImages = [...prevImages];
              const firstUpload = updatedImages.length === 0;
              
              newImages.forEach(newImg => {
                updatedImages.push({
                  ...newImg,
                  targetWidth: firstUpload ? String(newImg.width) : globalWidth,
                  targetHeight: firstUpload ? String(newImg.height) : globalHeight,
                });
              });

              if (firstUpload && updatedImages.length > 0) {
                 setGlobalWidth(String(updatedImages[0].width));
                 setGlobalHeight(String(updatedImages[0].height));
              }
              
              return updatedImages;
            });
          }
        };
        img.src = resultStr;
      };
      reader.readAsDataURL(file);
    });
  };
  
  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleImageUpload(e.target.files);
      e.target.value = ""; // Reset file input
    }
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>, dragging: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(dragging);
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    handleDrag(e, false);
    if (e.dataTransfer.files) {
      handleImageUpload(e.dataTransfer.files);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => {
        const newImages = prev.filter((_, i) => i !== index);
        if (newImages.length === 0) {
            setGlobalWidth("");
            setGlobalHeight("");
        }
        return newImages;
    });
  }

  // Effect for GLOBAL width change
  useEffect(() => {
    if (images.length === 0 || lastEdited !== 'width') return;
    
    const newWidth = parseInt(globalWidth, 10);
    if (isNaN(newWidth)) return;

    setImages(prev => prev.map(img => {
      const aspectRatio = img.width / img.height;
      const newHeight = keepAspectRatio ? String(Math.round(newWidth / aspectRatio)) : img.targetHeight;
      return {...img, targetWidth: String(newWidth), targetHeight: newHeight};
    }));
    
    if (keepAspectRatio && images.length > 0) {
        const firstImage = images[0];
        const aspectRatio = firstImage.width / firstImage.height;
        setGlobalHeight(String(Math.round(newWidth / aspectRatio)));
    }
  }, [globalWidth, keepAspectRatio, lastEdited]);

  // Effect for GLOBAL height change
  useEffect(() => {
    if (images.length === 0 || lastEdited !== 'height') return;

    const newHeight = parseInt(globalHeight, 10);
    if (isNaN(newHeight)) return;

    setImages(prev => prev.map(img => {
        const aspectRatio = img.width / img.height;
        const newWidth = keepAspectRatio ? String(Math.round(newHeight * aspectRatio)) : img.targetWidth;
        return {...img, targetHeight: String(newHeight), targetWidth: newWidth};
    }));

    if (keepAspectRatio && images.length > 0) {
        const firstImage = images[0];
        const aspectRatio = firstImage.width / firstImage.height;
        setGlobalWidth(String(Math.round(newHeight * aspectRatio)));
    }
  }, [globalHeight, keepAspectRatio, lastEdited]);

  const handleIndividualDimChange = (index: number, dimension: 'width' | 'height', value: string) => {
    const numericValue = parseInt(value, 10);
    setImages(prev => {
        const newImages = [...prev];
        const img = newImages[index];
        if (dimension === 'width') {
            img.targetWidth = value;
            if (keepAspectRatio && !isNaN(numericValue)) {
                const aspectRatio = img.width / img.height;
                img.targetHeight = String(Math.round(numericValue / aspectRatio));
            }
        } else {
            img.targetHeight = value;
            if (keepAspectRatio && !isNaN(numericValue)) {
                const aspectRatio = img.width / img.height;
                img.targetWidth = String(Math.round(numericValue * aspectRatio));
            }
        }
        return newImages;
    });
  };

  const handleDownload = async () => {
    if (images.length === 0) {
      toast({
        title: translations.toasts.noImages.title,
        description: translations.toasts.noImages.description,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
        const zip = new JSZip();

        for (const imageInfo of images) {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Could not get canvas context");
            
            const img = new Image();
            img.src = imageInfo.preview;

            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = reject;
            });
            
            const newWidth = parseInt(imageInfo.targetWidth, 10) || imageInfo.width;
            const newHeight = parseInt(imageInfo.targetHeight, 10) || imageInfo.height;
            
            canvas.width = newWidth;
            canvas.height = newHeight;
            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            const mimeType = `image/${format}`;
            const dataUrl = canvas.toDataURL(mimeType, format !== 'png' ? quality / 100 : undefined);
            
            const originalName = imageInfo.file.name.substring(0, imageInfo.file.name.lastIndexOf('.'));
            const fileName = `${originalName}_${newWidth}x${newHeight}.${format}`;
            zip.file(fileName, dataUrl.split(',')[1], { base64: true });
        }
        
        if (images.length === 1) {
            const imageInfo = images[0];
            const newWidth = parseInt(imageInfo.targetWidth, 10) || imageInfo.width;
            const newHeight = parseInt(imageInfo.targetHeight, 10) || imageInfo.height;
            const originalName = imageInfo.file.name.substring(0, imageInfo.file.name.lastIndexOf('.'));
            const fileName = `${originalName}_${newWidth}x${newHeight}.${format}`;

            const fileBlob = await zip.file(fileName)?.async("blob");
            if (fileBlob) {
                const link = document.createElement("a");
                link.href = URL.createObjectURL(fileBlob);
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            }

        } else {
            const zipBlob = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(zipBlob);
            link.download = translations.download.zipName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        }
      
       toast({
        title: translations.toasts.downloadStarted.title,
        description: translations.toasts.downloadStarted.description,
      });
    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: translations.toasts.processingError.title,
        description: translations.toasts.processingError.description,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const getDownloadButtonText = () => {
    if (isProcessing) {
      return translations.download.processing;
    }
    if (images.length > 1) {
      return translations.download.downloadMultiple.replace('{count}', String(images.length));
    }
    return translations.download.downloadSingle;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-grow p-4 sm:p-8 flex items-center justify-center">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="text-accent h-6 w-6" />
                <CardTitle className="text-2xl font-headline">{translations.main.title}</CardTitle>
              </div>
              <CardDescription>{translations.main.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-6">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200",
                  isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={(e) => handleDrag(e, true)}
                onDragLeave={(e) => handleDrag(e, false)}
                onDragOver={(e) => handleDrag(e, true)}
                onDrop={handleDrop}
              >
                <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">
                  <span className="font-semibold text-accent">{translations.upload.clickToUpload}</span> {translations.upload.dragAndDrop}
                </p>
                <p className="text-xs text-muted-foreground">{translations.upload.fileTypes}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={onFileChange}
                  multiple
                />
              </div>
              
              {images.length > 0 && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-end">
                      <div className="space-y-2">
                          <Label htmlFor="width">{translations.options.width}</Label>
                          <Input id="width" type="number" value={globalWidth} onChange={(e) => { setGlobalWidth(e.target.value); setLastEdited('width'); }} placeholder={translations.options.allImages} />
                      </div>
                      <Button variant="ghost" size="icon" className="mb-1" onClick={() => setKeepAspectRatio(!keepAspectRatio)}>
                          {keepAspectRatio ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5 text-muted-foreground" />}
                      </Button>
                      <div className="space-y-2">
                          <Label htmlFor="height">{translations.options.height}</Label>
                          <Input id="height" type="number" value={globalHeight} onChange={(e) => { setGlobalHeight(e.target.value); setLastEdited('height'); }} placeholder={translations.options.allImages} />
                      </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="format">{translations.options.format}</Label>
                     <Select value={format} onValueChange={(v) => setFormat(v as Format)}>
                      <SelectTrigger id="format" className="w-full">
                        <SelectValue placeholder={translations.options.selectFormat} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="jpeg">{translations.formats.jpeg}</SelectItem>
                        <SelectItem value="png">{translations.formats.png}</SelectItem>
                        <SelectItem value="webp">{translations.formats.webp}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {format !== 'png' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="quality">{translations.options.quality}</Label>
                        <span className="text-sm font-medium text-muted-foreground">{quality}%</span>
                      </div>
                      <Slider
                        id="quality"
                        min={1}
                        max={100}
                        step={1}
                        value={[quality]}
                        onValueChange={(v) => setQuality(v[0])}
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                onClick={handleDownload}
                disabled={images.length === 0 || isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {getDownloadButtonText()}
              </Button>
            </CardFooter>
          </Card>

          <Card className="flex items-center justify-center p-4 min-h-[400px] lg:min-h-0 bg-card/50">
            {images.length > 0 ? (
              <ScrollArea className="w-full h-full max-h-[70vh]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                  {images.map((image, index) => (
                      <div key={index} className="relative group space-y-2 rounded-lg border p-2 bg-background">
                        <div className="relative aspect-video">
                          <NextImage
                              src={image.preview}
                              alt={`${translations.preview.alt} ${index + 1}`}
                              fill
                              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                              style={{ objectFit: 'contain' }}
                              className="rounded-md"
                          />
                          <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeImage(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center p-1 rounded-b-md">
                              {image.width}x{image.height}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <Input 
                                type="number"
                                placeholder={translations.options.width.split(' ')[0]}
                                value={image.targetWidth}
                                onChange={(e) => handleIndividualDimChange(index, 'width', e.target.value)}
                                className="text-xs h-8"
                           />
                           <span className="text-muted-foreground">x</span>
                           <Input 
                                type="number"
                                placeholder={translations.options.height.split(' ')[0]}
                                value={image.targetHeight}
                                onChange={(e) => handleIndividualDimChange(index, 'height', e.target.value)}
                                className="text-xs h-8"
                           />
                        </div>
                      </div>
                  ))}
                  </div>
              </ScrollArea>
            ) : (
              <div className="text-center text-muted-foreground">
                <FileImage className="mx-auto h-24 w-24" />
                <p className="mt-4 font-medium">{translations.preview.title}</p>
                <p className="text-sm">{translations.preview.description}</p>
              </div>
            )}
          </Card>
        </div>
      </main>
      <footer className="bg-muted text-muted-foreground p-6 mt-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-2">
              <h3 className="text-lg font-semibold text-foreground">{translations.footer.title}</h3>
              <p className="mt-2 text-sm">
                {translations.footer.description}
              </p>
               <div className="mt-4 flex items-center gap-4">
                <Link href={translations.footer.credit.url} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-accent transition-colors flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  {translations.footer.credit.text}
                </Link>
                <Link href={translations.footer.sourceCode.url} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-accent transition-colors flex items-center gap-2">
                  <Github className="h-4 w-4" />
                  {translations.footer.sourceCode.text}
                </Link>
               </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{translations.footer.otherProjects.title}</h3>
              <ul className="mt-2 space-y-2">
                <li>
                  <Link href={translations.footer.otherProjects.subtitleFlow.url} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-accent transition-colors block p-2 -mx-2 rounded-md hover:bg-card/50">
                    <div className="flex items-center gap-3 font-medium text-foreground">
                      <Languages className="h-5 w-5 text-accent" />
                      <span>{translations.footer.otherProjects.subtitleFlow.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-8">{translations.footer.otherProjects.subtitleFlow.description}</p>
                  </Link>
                </li>
                <li>
                  <Link href={translations.footer.otherProjects.autoCast.url} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-accent transition-colors block p-2 -mx-2 rounded-md hover:bg-card/50">
                     <div className="flex items-center gap-3 font-medium text-foreground">
                       <Mic className="h-5 w-5 text-accent" />
                       <span>{translations.footer.otherProjects.autoCast.title}</span>
                     </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-8">{translations.footer.otherProjects.autoCast.description}</p>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{translations.footer.language.title}</h3>
              <LanguageSwitcher />
            </div>
          </div>
          <div className="mt-8 border-t border-border pt-6 text-center text-xs">
            <p>&copy; {new Date().getFullYear()} {translations.footer.copyright}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

    